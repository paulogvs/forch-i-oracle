// FORCH.i ORACLE — API Route: Live Update
// Receives a real match result, re-simulates the tournament, returns drift data.
// POST /api/live-update

import { NextRequest, NextResponse } from 'next/server';
import { recalculateAfterResult, getLiveStandings, getLiveBracket } from '@/lib/prediction-history';
import { ALL_MATCHES } from '@/lib/matches';

export async function POST(request: NextRequest) {
  try {
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

    // Find match details
    const match = ALL_MATCHES.find(m => m.id === matchId);
    if (!match) {
      return NextResponse.json(
        { error: 'Partido no encontrado' },
        { status: 404 }
      );
    }

    // Re-simulate and get drift
    const result = await recalculateAfterResult(matchId, homeScore, awayScore);

    // Get live standings
    const liveStandings = await getLiveStandings();

    return NextResponse.json({
      success: true,
      message: `${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam}`,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore,
      awayScore,
      drifts: result.drifts,
      driftCount: result.drifts.length,
      liveStandings,
      bracket: result.bracket ? {
        roundOf32: result.bracket.roundOf32,
        roundOf16: result.bracket.roundOf16,
        quarters: result.bracket.quarters,
        semis: result.bracket.semis,
        thirdPlace: result.bracket.thirdPlace,
        final: result.bracket.final,
        champion: result.bracket.champion,
        championFlag: result.bracket.championFlag,
      } : null,
      top8: result.top8,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[live-update] Error:', msg);
    return NextResponse.json(
      { error: 'Error procesando actualización', details: msg },
      { status: 500 }
    );
  }
}

// GET — Get current live state
export async function GET() {
  try {
    const liveStandings = await getLiveStandings();
    const liveBracket = await getLiveBracket();

    return NextResponse.json({
      success: true,
      liveStandings,
      liveBracket: liveBracket ? {
        roundOf32: liveBracket.roundOf32,
        roundOf16: liveBracket.roundOf16,
        quarters: liveBracket.quarters,
        semis: liveBracket.semis,
        thirdPlace: liveBracket.thirdPlace,
        final: liveBracket.final,
        champion: liveBracket.champion,
        championFlag: liveBracket.championFlag,
      } : null,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error obteniendo estado vivo', details: msg },
      { status: 500 }
    );
  }
}
