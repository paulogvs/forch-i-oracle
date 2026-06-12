// FORCH.i ORACLE — API Route: Get All Pre-Calculated Predictions
// Returns all pre-calculated predictions + tournament probabilities for the fixture view.
// GET /api/predictions/all

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';

export async function GET() {
  try {
    const db = await getDataLayerAsync();

    // Get all matches
    const allMatches = await db.getAllMatches();

    // Get all predictions
    const matchIds = allMatches.map(m => m.id);
    const predictions = await db.getPredictionsForMatches(matchIds);

    // Get tournament probabilities
    const tournamentProbs = await db.getTournamentProbs();

    // Get team forms
    const teamForms = await db.getAllTeamForms();

    // Build response
    const predictionsMap = new Map(predictions.map(p => [p.matchId, p]));
    const formMap = new Map(teamForms.map(f => [f.teamId, f]));

    const matchesWithPredictions = allMatches.map(match => ({
      ...match,
      prediction: predictionsMap.get(match.id),
      homeForm: formMap.get(match.homeTeamId),
      awayForm: formMap.get(match.awayTeamId),
    }));

    return NextResponse.json({
      success: true,
      matches: matchesWithPredictions,
      tournamentProbs: tournamentProbs.slice(0, 20),
      totalPredictions: predictions.length,
      totalMatches: allMatches.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error obteniendo predicciones', details: msg },
      { status: 500 }
    );
  }
}
