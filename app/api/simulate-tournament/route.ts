// FORCH.i ORACLE — API Route: Simulate entire tournament (v2 with Data Layer)
// Uses the data layer for persisting real results and champion probabilities.
import { NextRequest, NextResponse } from 'next/server';
import { simulateTournamentMulti, type RealMatchResult } from '@/lib/tournament-sim';
import { getDataLayer } from '@/lib/data-layer';
import { getLiveStandings, getLiveBracket } from '@/lib/prediction-history';

export async function POST(request: NextRequest) {
  try {
    const db = getDataLayer();
    const body = await request.json().catch(() => ({}));
    const submittedResults: RealMatchResult[] = body.results || [];

    // Store any submitted real results in the data layer
    for (const r of submittedResults) {
      await db.submitMatchResult({
        matchId: r.matchId,
        homeScore: r.homeScore,
        awayScore: r.awayScore,
        winner: r.winner,
      });
    }

    // Get all real results from data layer
    const storedResults = await db.getMatchResults();
    const simResults: RealMatchResult[] = storedResults.map(r => ({
      matchId: r.matchId,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      winner: r.winner,
    }));

    console.log(`[tournament:v2] Multi-simulating with ${simResults.length} real results...`);

    const result = await simulateTournamentMulti(
      100,
      simResults,
      (msg) => console.log(`[tournament:v2] ${msg}`)
    );

    // Save champion probabilities to data layer
    if (result.top8.length > 0) {
      const probs = result.top8.map(entry => ({
        teamId: entry.team,
        championProb: entry.pct,
        simulationsCount: entry.wins,
        totalSimulations: result.totalSims,
      }));

      try {
        await db.saveTournamentProbs(probs);
        console.log(`[tournament:v2] Saved ${probs.length} champion probabilities`);
      } catch {
        console.warn('[tournament:v2] Could not save champion probabilities');
      }
    }

    // Get live standings and bracket from real results
    const liveStandings = await getLiveStandings();
    const liveBracket = await getLiveBracket();

    return NextResponse.json({
      success: true,
      bracket: result.bracket,
      top8: result.top8,
      totalSims: result.totalSims,
      fromCache: false,
      realResultsCount: simResults.length,
      results: simResults,
      liveStandings,
      liveBracket,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[tournament:v2] Simulation failed:', errorMsg);

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
    const db = getDataLayer();
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
    const db = getDataLayer();
    const results = await db.getMatchResults();

    // Also get tournament probabilities
    const probs = await db.getTournamentProbs();

    return NextResponse.json({
      success: true,
      results,
      total: results.length,
      championProbs: probs,
    });
  } catch {
    return NextResponse.json({
      success: true,
      results: [],
      total: 0,
      championProbs: [],
    });
  }
}

/** Clear all stored results */
export async function DELETE() {
  try {
    const db = getDataLayer();
    await db.clearMatchResults();
    return NextResponse.json({ success: true, message: 'Resultados eliminados' });
  } catch {
    return NextResponse.json(
      { error: 'Error eliminando resultados' },
      { status: 500 }
    );
  }
}
