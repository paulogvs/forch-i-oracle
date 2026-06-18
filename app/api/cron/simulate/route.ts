// FORCH.i ORACLE — Cron Job: Tournament Simulation
// Vercel Cron job that runs 5,000 tournament simulations and saves champion probabilities.
// Schedule: Daily at 00:00 UTC
// Trigger: GET /api/cron/simulate

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { simulateTournamentMulti, type RealMatchResult } from '@/lib/tournament-sim';
import { validateCronAuth } from '@/lib/cron-auth';
import { saveBracketAndPredictions } from '@/lib/tournament-results';

const NUM_SIMULATIONS = 5000;

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = await getDataLayerAsync();
  const results = {
    simulationsCompleted: 0,
    teamsRanked: 0,
    topTeam: '',
    topProb: 0,
    errors: [] as string[],
  };

  try {
    console.log(`[cron:simulate] Starting ${NUM_SIMULATIONS} tournament simulations...`);

    const realResults = await db.getMatchResults();
    console.log(`[cron:simulate] Incorporating ${realResults.length} real match results`);

    let lastProgress = '';
    const onProgress = (msg: string) => {
      if (msg !== lastProgress) {
        console.log(`[cron:simulate] ${msg}`);
        lastProgress = msg;
      }
    };

    const simResults: RealMatchResult[] = realResults.map(r => ({
      matchId: r.matchId,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      winner: r.winner,
    }));

    const multiResult = await simulateTournamentMulti(NUM_SIMULATIONS, simResults, onProgress);

    // Use bracket from the simulation that produced the most frequent champion
    const bracket = multiResult.bracket;

    results.simulationsCompleted = multiResult.totalSims;

    const probs = multiResult.top8.map(entry => ({
      teamId: entry.team,
      championProb: entry.pct,
      simulationsCount: entry.wins,
      totalSimulations: multiResult.totalSims,
    }));

    await db.saveTournamentProbs(probs);
    results.teamsRanked = probs.length;

    // Store bracket + persist all knockout match predictions from the consensus bracket
    await saveBracketAndPredictions(db, bracket);

    // Save consensusBracketHash to prevent redundant re-computation
    const resultsHash = realResults.map((r: any) => `${r.matchId}:${r.homeScore}-${r.awayScore}`).join('|');
    await db.setKeyValue('consensusBracketHash', resultsHash);


    if (probs.length > 0) {
      results.topTeam = probs[0].teamId;
      results.topProb = probs[0].championProb;
    }

    const duration = Date.now() - startTime;

    await db.updateCronStatus({
      jobName: 'simulate',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: results.teamsRanked,
    });

    console.log(`[cron:simulate] Completed in ${duration}ms. Top: ${results.topTeam} (${results.topProb}%)`);

    return NextResponse.json({
      success: true,
      duration,
      simulationsCompleted: results.simulationsCompleted,
      teamsRanked: results.teamsRanked,
      topTeam: results.topTeam,
      topProb: results.topProb,
      top8: multiResult.top8.slice(0, 8),
      bracket,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:simulate] Fatal error:', msg);

    await db.updateCronStatus({
      jobName: 'simulate',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
