// FORCH.i ORACLE — API Route: Tournament Simulation Results
// GET /api/simulate-tournament — SINGLE SOURCE OF TRUTH

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { getLiveStandings } from '@/lib/prediction-history';
import { getOrComputeTournamentResults } from '@/lib/tournament-results';
import { buildTournamentDAG } from '@/lib/tournament-dag';

export async function GET() {
  try {
    const db = await getDataLayerAsync();
    const results = await db.getMatchResults();
    const liveStandings = await getLiveStandings();
    const data = await getOrComputeTournamentResults();

    // Tournament DAG
    const dag = buildTournamentDAG();

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      championProbs: data.championProbs,
      top8: data.top8,
      liveStandings,
      bracket: data.bracket,
      bracketDAG: {
        nodes: dag.nodes.map(n => ({
          matchId: n.matchId,
          round: n.round,
          roundLabel: n.roundLabel,
          feedsInto: n.feedsInto,
          feedsIntoSlot: n.feedsIntoSlot,
          feedsFrom: n.feedsFrom,
        })),
        depth: dag.depth,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      results: [],
      total: 0,
      championProbs: [],
      top8: [],
      liveStandings: {},
      bracket: null,
    });
  }
}
