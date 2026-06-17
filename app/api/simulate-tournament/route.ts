// FORCH.i ORACLE — API Route: Tournament Simulation Results
// GET /api/simulate-tournament — Read stored results
//
// NOTE: Simulation is triggered by cron jobs (/api/cron/simulate)
// Match results are submitted via POST /api/match-result

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { getLiveStandings, getLiveBracket } from '@/lib/prediction-history';

/** Get all stored real results */
export async function GET() {
  try {
    const db = await getDataLayerAsync();
    const results = await db.getMatchResults();
    const probs = await db.getTournamentProbs();
    const liveStandings = await getLiveStandings();
    const liveBracket = await getLiveBracket();

    // Map response fields for both INICIO and FIXTURE pages
    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      championProbs: probs,
      top8: probs.slice(0, 8).map(p => ({
        team: p.teamId,
        flag: '',
        wins: p.simulationsCount,
        pct: p.championProb,
      })),
      liveStandings,
      liveBracket,
      bracket: liveBracket,
    });
  } catch {
    return NextResponse.json({
      success: true,
      results: [],
      total: 0,
      championProbs: [],
      top8: [],
      liveStandings: {},
      liveBracket: null,
      bracket: null,
    });
  }
}
