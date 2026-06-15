// FORCH.i ORACLE — API Route: Live Update
// GET /api/live-update — Get current live state
//
// NOTE: Match results are submitted via POST /api/match-result
// This endpoint provides read-only access to live standings and bracket

import { NextResponse } from 'next/server';
import { getLiveStandings, getLiveBracket } from '@/lib/prediction-history';

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
