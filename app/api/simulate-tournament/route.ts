// FORCH.i ORACLE — API Route: Simulate entire tournament
// Usa el motor estadístico real (Poisson + Elo + xG)
import { NextRequest, NextResponse } from 'next/server';
import { simulateTournamentMulti, type RealMatchResult } from '@/lib/tournament-sim';

// In-memory cache for real results
const realResults = new Map<string, RealMatchResult>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const submittedResults: RealMatchResult[] = body.results || [];

    // Store any submitted real results
    for (const r of submittedResults) {
      realResults.set(r.matchId, r);
    }

    const resultsArray = Array.from(realResults.values());

    console.log(`[tournament] Multi-simulating with ${resultsArray.length} real results...`);

    const result = await simulateTournamentMulti(
      100, // 100 simulaciones para probabilidad estable
      resultsArray,
      (msg) => console.log(`[tournament] ${msg}`)
    );

    return NextResponse.json({
      success: true,
      bracket: result.bracket,
      top8: result.top8,
      totalSims: result.totalSims,
      fromCache: false,
      realResultsCount: resultsArray.length,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[tournament] Simulation failed:', errorMsg);

    return NextResponse.json(
      {
        error: 'Error simulando el torneo. Intenta de nuevo.',
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
      },
      { status: 500 }
    );
  }
}

/** Submit a real match result */
export async function PUT(request: NextRequest) {
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

    const winner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw';

    // Find the team names from matchId
    // MatchId format: A1, B3, R32-1, etc.
    const result: RealMatchResult = {
      matchId,
      homeScore,
      awayScore,
      winner,
    };

    realResults.set(matchId, result);

    return NextResponse.json({
      success: true,
      message: `Resultado guardado: ${matchId} ${homeScore}-${awayScore}`,
      totalResults: realResults.size,
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
  return NextResponse.json({
    success: true,
    results: Array.from(realResults.values()),
    total: realResults.size,
  });
}

/** Clear all stored results */
export async function DELETE() {
  realResults.clear();
  return NextResponse.json({ success: true, message: 'Resultados eliminados' });
}
