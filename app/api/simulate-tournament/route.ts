// FORCH.i ORACLE — API Route: Tournament Simulation Results
// GET /api/simulate-tournament — Read stored results
// PUT /api/simulate-tournament — Submit a real match result
// DELETE /api/simulate-tournament — Clear all results
//
// NOTE: Simulation is now triggered ONLY by cron jobs (/api/cron/simulate)
// Manual "Simular" button has been removed.

import { NextRequest, NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { getLiveStandings, getLiveBracket } from '@/lib/prediction-history';

/** Submit a real match result */
export async function PUT(request: NextRequest) {
  try {
    const db = await getDataLayerAsync();
    const body = await request.json();
    const { matchId, homeScore, awayScore } = body as {
      matchId: string;
      homeScore: number;
      awayScore: number;
    };

    if (!matchId || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: 'matchId, homeScore, y awayScore son requeridos' },
        { status: 400 }
      );
    }

    // Look up match to get team names for the winner field
    const match = await db.getMatch(matchId);
    const winner = homeScore > awayScore
      ? (match?.homeTeamId || 'home')
      : awayScore > homeScore
        ? (match?.awayTeamId || 'away')
        : 'draw';

    await db.submitMatchResult({
      matchId,
      homeScore,
      awayScore,
      winner,
    });

    const totalResults = (await db.getMatchResults()).length;

    return NextResponse.json({
      success: true,
      message: `Resultado guardado: ${matchId} ${homeScore}-${awayScore}`,
      totalResults,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error guardando resultado' },
      { status: 500 }
    );
  }
}

/** Get all stored real results */
export async function GET() {
  try {
    const db = await getDataLayerAsync();
    const results = await db.getMatchResults();
    const probs = await db.getTournamentProbs();
    const liveStandings = await getLiveStandings();
    const liveBracket = await getLiveBracket();

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      championProbs: probs,
      liveStandings,
      liveBracket,
    });
  } catch {
    return NextResponse.json({
      success: true,
      results: [],
      total: 0,
      championProbs: [],
      liveStandings: {},
      liveBracket: null,
    });
  }
}

/** Clear all stored results */
export async function DELETE() {
  try {
    const db = await getDataLayerAsync();
    await db.clearMatchResults();
    return NextResponse.json({ success: true, message: 'Resultados eliminados' });
  } catch {
    return NextResponse.json(
      { error: 'Error eliminando resultados' },
      { status: 500 }
    );
  }
}
