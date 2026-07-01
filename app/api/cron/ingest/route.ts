// FORCH.i ORACLE — Cron Job: Data Ingestion (v2 — FIFA API)
// Triggered by GitHub Actions (cada 15 min durante partidos)
// Backup: Vercel Cron (1x/día a las 6 AM UTC)
//
// DATA SOURCE: FIFA Public API (api.fifa.com/api/v3)
//   - Gratis, sin API key, datos oficiales en tiempo real
//   - Reemplaza: wheniskickoff.com, openfootball, API-Football, football-data.org
//
// AUTO-SIMULATE: Después de ingestar resultados, dispara /api/cron/simulate

import { NextResponse } from 'next/server';
import { getDataLayerAsync, type IDataLayer } from '@/lib/data-layer';
import { validateCronAuth } from '@/lib/cron-auth';
import { fetchFIFAMatches, toInternalResult, type FIFAMatch } from '@/lib/fifa-api';

// ═══════════════════════════════════════════════════════════════
// DIAGNOSTIC LOG
// ═══════════════════════════════════════════════════════════════

interface DiagnosticLog {
  step: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: unknown;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  return handleIngest(request);
}

export async function POST(request: Request) {
  return handleIngest(request);
}

async function handleIngest(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = await getDataLayerAsync();
  const diagnostics: DiagnosticLog[] = [];
  const results = {
    resultsIngested: 0,
    formsUpdated: 0,
    errors: [] as string[],
  };

  try {
    console.log('[cron:ingest] Starting FIFA API ingestion...');

    // Step 1: Check data layer
    try {
      const teams = await db.getAllTeams();
      diagnostics.push({
        step: 'database',
        status: 'ok',
        message: `Data layer connected. ${teams.length} teams.`,
      });
    } catch (err) {
      diagnostics.push({
        step: 'database',
        status: 'error',
        message: `Data layer error: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // Step 2: Fetch matches from FIFA API
    diagnostics.push({
      step: 'source',
      status: 'ok',
      message: 'Fetching matches from FIFA public API (free, no key required)',
    });

    const fifaMatches = await fetchFIFAMatches('es');

    if (fifaMatches.length === 0) {
      diagnostics.push({
        step: 'fifa_api',
        status: 'error',
        message: 'FIFA API returned 0 matches. Ingestion aborted.',
      });
      return NextResponse.json({
        success: false,
        error: 'FIFA API unavailable',
        diagnostics,
      }, { status: 502 });
    }

    diagnostics.push({
      step: 'fifa_api',
      status: 'ok',
      message: `Received ${fifaMatches.length} matches from FIFA API`,
    });

    // Step 3: Process finished matches only
    const finishedMatches = fifaMatches.filter(m => m.status === 'finished' && m.home?.code && m.away?.code);
    diagnostics.push({
      step: 'filter',
      status: 'ok',
      message: `${finishedMatches.length} finished matches with scores (${fifaMatches.length - finishedMatches.length} upcoming/live)`,
    });

    // Step 4: Get existing results for dedup
    const existingResults = await db.getMatchResults();
    const existingResultIds = new Set(existingResults.map(r => r.matchId));

    // Step 5: Ingest each finished match
    let processed = 0;
    let skipped = 0;

    for (const fm of finishedMatches) {
      const internal = toInternalResult(fm);
      if (!internal) {
        skipped++;
        continue;
      }

      // Find match in database
      let match = await db.getMatchByTeams(internal.homeTeam, internal.awayTeam);
      if (!match) {
        match = await db.getMatchByTeams(internal.awayTeam, internal.homeTeam);
      }

      if (!match) {
        diagnostics.push({
          step: 'match_lookup',
          status: 'warn',
          message: `No match found for ${internal.homeTeam} vs ${internal.awayTeam} (FIFA match ${fm.id})`,
        });
        skipped++;
        continue;
      }

      // Deduplicate
      if (existingResultIds.has(match.id)) {
        skipped++;
        continue;
      }

      // Ingest!
      await db.submitMatchResult({
        matchId: match.id,
        homeScore: internal.homeScore,
        awayScore: internal.awayScore,
        winner: internal.winner,
      });

      // Update team form
      await updateTeamForm(db, internal.homeTeam, internal.awayTeam, internal.homeScore, internal.awayScore);
      results.formsUpdated += 2;
      results.resultsIngested++;
      processed++;
      existingResultIds.add(match.id);

      console.log(`[cron:ingest] Ingested: ${internal.homeTeam} ${internal.homeScore}-${internal.awayScore} ${internal.awayTeam}`);
    }

    diagnostics.push({
      step: 'ingest',
      status: 'ok',
      message: `Processed ${finishedMatches.length} finished: ${processed} ingested, ${skipped} skipped (no match/dup/TBD)`,
    });

    // Step 6: Auto-simulate after successful ingestion
    if (results.resultsIngested > 0) {
      diagnostics.push({
        step: 'ingest_summary',
        status: 'ok',
        message: `${results.resultsIngested} new results ingested, ${results.formsUpdated} forms updated`,
      });

      try {
        const crs = process.env.CRON_SECRET || '';
        const simUrl = new URL(request.url);
        simUrl.pathname = '/api/cron/simulate';
        const simRes = await fetch(simUrl.toString(), {
          headers: { Authorization: `Bearer ${crs}` },
          signal: AbortSignal.timeout(120000),
        });
        const simData = await simRes.json().catch(() => ({}));
        diagnostics.push({
          step: 'auto_simulate',
          status: simRes.ok ? 'ok' : 'warn',
          message: simRes.ok
            ? `Auto-simulate triggered: ${simData.simulationsCompleted ?? '?'} sims`
            : `Auto-simulate failed: HTTP ${simRes.status}`,
        });
      } catch (err) {
        diagnostics.push({
          step: 'auto_simulate',
          status: 'warn',
          message: `Auto-simulate error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    // Step 7: Update cron status
    const duration = Date.now() - startTime;
    await db.updateCronStatus({
      jobName: 'ingest',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: processed,
    });

    console.log(`[cron:ingest] Done in ${duration}ms — ${results.resultsIngested} ingested`);

    return NextResponse.json({
      success: true,
      duration,
      resultsIngested: results.resultsIngested,
      formsUpdated: results.formsUpdated,
      fifaMatchesReceived: fifaMatches.length,
      finishedCount: finishedMatches.length,
      diagnostics,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:ingest] Fatal:', msg);

    await db.updateCronStatus({
      jobName: 'ingest',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg, diagnostics }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// UPDATE TEAM FORM
// ═══════════════════════════════════════════════════════════════

async function updateTeamForm(
  db: IDataLayer,
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number
) {
  const now = new Date().toISOString().split('T')[0];

  for (const [team, goalsFor, goalsAgainst] of [
    [homeTeam, homeGoals, awayGoals],
    [awayTeam, awayGoals, homeGoals],
  ] as [string, number, number][]) {
    const existingForm = await db.getTeamForm(team);
    const result = goalsFor > goalsAgainst ? 'W' as const : goalsFor < goalsAgainst ? 'L' as const : 'D' as const;

    const last5 = [
      ...(existingForm?.last5 || []),
      {
        result,
        opponent: team === homeTeam ? awayTeam : homeTeam,
        goalsFor,
        goalsAgainst,
        date: now,
        competition: 'World Cup',
      },
    ].slice(-5);

    const momentum = last5.reduce((sum, m, i) => {
      const weight = (i + 1) / last5.length;
      return sum + (m.result === 'W' ? weight : m.result === 'L' ? -weight : 0);
    }, 0) / last5.length;

    const existingElo = (await db.getTeam(team))?.eloRating || 1500;

    await db.saveTeamForm({
      teamId: team,
      last5,
      xgFor: goalsFor > 0 ? goalsFor : 0.8,
      xgAgainst: goalsAgainst,
      momentum,
      matchesPlayed: (existingForm?.matchesPlayed || 0) + 1,
      eloDynamic: existingElo + (momentum * 20),
    });
  }
}
