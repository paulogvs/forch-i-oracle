// FORCH.i ORACLE — Cron Job: Data Ingestion (v3 — Hardcoded Results)
// Triggered by cronjob (3h after each match) or manually via POST
//
// DATA SOURCE: lib/hardcoded-results.ts — static, user-provided results.
// NO external API calls.
//
// AUTO-SIMULATE: After ingesting results, triggers /api/cron/simulate

import { NextResponse } from 'next/server';
import { getDataLayerAsync, type IDataLayer } from '@/lib/data-layer';
import { validateCronAuth } from '@/lib/cron-auth';
import { HARDCODED_RESULTS } from '@/lib/hardcoded-results';
import { ALL_MATCHES } from '@/lib/matches';

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
    console.log('[cron:ingest] Starting hardcoded results ingestion...');

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

    diagnostics.push({
      step: 'source',
      status: 'ok',
      message: `Loading ${HARDCODED_RESULTS.length} hardcoded results from lib/hardcoded-results.ts`,
    });

    // Step 2: Get ALL_MATCHES for team name resolution
    const allMatches = ALL_MATCHES;
    const matchesById = new Map(allMatches.map(m => [m.id, m]));

    // Step 3: Get existing results for dedup
    const existingResults = await db.getMatchResults();
    const existingResultIds = new Set(existingResults.map(r => r.matchId));

    // Step 4: Ingest each hardcoded result
    let processed = 0;
    let skipped = 0;

    for (const hr of HARDCODED_RESULTS) {
      const match = matchesById.get(hr.matchId);
      if (!match) {
        diagnostics.push({
          step: 'match_lookup',
          status: 'warn',
          message: `No match found for ID: ${hr.matchId}`,
        });
        skipped++;
        continue;
      }

      // Deduplicate
      if (existingResultIds.has(hr.matchId)) {
        skipped++;
        continue;
      }

      // Ingest!
      const winner = hr.homeScore > hr.awayScore
        ? match.homeTeam
        : hr.awayScore > hr.homeScore
          ? match.awayTeam
          : 'draw';

      await db.submitMatchResult({
        matchId: hr.matchId,
        homeScore: hr.homeScore,
        awayScore: hr.awayScore,
        winner,
      });

      // Update team form
      await updateTeamForm(db, match.homeTeam, match.awayTeam, hr.homeScore, hr.awayScore);
      results.formsUpdated += 2;
      results.resultsIngested++;
      processed++;
      existingResultIds.add(hr.matchId);

      console.log(`[cron:ingest] Ingested: ${match.homeTeam} ${hr.homeScore}-${hr.awayScore} ${match.awayTeam}`);
    }

    diagnostics.push({
      step: 'ingest',
      status: 'ok',
      message: `Processed ${HARDCODED_RESULTS.length} results: ${processed} ingested, ${skipped} skipped (already ingested)` + 
        (processed === 0 ? ' (all already ingested)' : ''),
    });

    // Step 5: Auto-simulate after successful ingestion
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

    // Step 6: Update cron status
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
      hardcodedResultsTotal: HARDCODED_RESULTS.length,
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
