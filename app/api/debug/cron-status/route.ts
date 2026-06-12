// FORCH.i ORACLE — Debug Endpoint: Cron Status & Pipeline Diagnostics
// GET /api/debug/cron-status — Full diagnostic of the data pipeline
// No auth required — for development debugging only

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { WORLD_CUP_TEAMS } from '@/lib/teams';

export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  // 1. Environment Check
  diagnostics.environment = {
    FOOTBALL_API_KEY: process.env.FOOTBALL_API_KEY ? `${process.env.FOOTBALL_API_KEY.slice(0, 6)}...` : 'NOT SET',
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
    SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : (process.env.SUPABASE_KEY ? 'SET (via SUPABASE_KEY)' : 'NOT SET'),
    NODE_ENV: process.env.NODE_ENV,
  };

  // 2. Database Check
  try {
    const db = await getDataLayerAsync();
    const teams = await db.getAllTeams();
    const matches = await db.getAllMatches();
    const results = await db.getMatchResults();

    const finishedMatches = matches.filter(m => m.status === 'finished');
    const scheduledMatches = matches.filter(m => m.status === 'scheduled');
    const liveMatches = matches.filter(m => m.status === 'live');

    // Sample a few matches to verify data integrity
    const sampleMatches = matches.slice(0, 5).map(m => ({
      id: m.id,
      home: m.homeTeamId,
      away: m.awayTeamId,
      status: m.status,
      score: m.scoreHome !== undefined ? `${m.scoreHome}-${m.scoreAway}` : 'N/A',
      date: m.matchDate,
    }));

    // Check team forms
    const teamForms: Record<string, unknown> = {};
    for (const team of WORLD_CUP_TEAMS.slice(0, 5)) {
      const form = await db.getTeamForm(team.name);
      teamForms[team.name] = form ? {
        matchesPlayed: form.matchesPlayed,
        last5Results: form.last5.map(m => m.result),
        momentum: form.momentum,
      } : 'NOT FOUND';
    }

    diagnostics.database = {
      status: 'connected',
      teams: teams.length,
      totalMatches: matches.length,
      finishedMatches: finishedMatches.length,
      scheduledMatches: scheduledMatches.length,
      liveMatches: liveMatches.length,
      realResults: results.length,
      sampleMatches,
      teamForms,
    };

    // 3. Cron Status
    const cronJobs = ['ingest', 'recalculate', 'simulate'];
    const cronStatus: Record<string, unknown> = {};
    for (const job of cronJobs) {
      const status = await db.getCronStatus(job);
      cronStatus[job] = status || 'never_run';
    }
    diagnostics.cronStatus = cronStatus;

    // 4. Predictions Check
    const allPredictions = await db.getPredictionsForMatches(matches.map(m => m.id));
    diagnostics.predictions = {
      total: allPredictions.length,
      withAnalysis: allPredictions.filter(p => p.analysis).length,
    };

    // 5. Tournament Probs
    const probs = await db.getTournamentProbs();
    diagnostics.tournamentProbs = {
      total: probs.length,
      top5: probs.slice(0, 5).map(p => ({
        team: p.teamId,
        probability: `${(p.championProb * 100).toFixed(1)}%`,
      })),
    };

    // 6. API-Football Test (quick probe)
    if (process.env.FOOTBALL_API_KEY) {
      try {
        const testResponse = await fetch('https://v3.football.api-sports.io/fixtures?league=9&season=2026&status=FT', {
          headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY },
          signal: AbortSignal.timeout(10000),
        });
        const testData = await testResponse.json();
        diagnostics.apiFootball = {
          status: testResponse.ok ? 'ok' : `HTTP ${testResponse.status}`,
          errors: testData.errors,
          fixturesReturned: testData.response?.length ?? 0,
          resultsAvailable: testData.results?.available,
        };
      } catch (err) {
        diagnostics.apiFootball = {
          status: 'error',
          message: err instanceof Error ? err.message : String(err),
        };
      }
    } else {
      diagnostics.apiFootball = {
        status: 'skipped',
        message: 'No FOOTBALL_API_KEY configured',
      };
    }

  } catch (err) {
    diagnostics.error = {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : undefined,
    };
  }

  return NextResponse.json(diagnostics);
}
