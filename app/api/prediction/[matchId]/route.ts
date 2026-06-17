// FORCH.i ORACLE — API Route: Get Pre-Calculated Prediction
// Reads pre-calculated predictions from the data layer.
// GET /api/prediction/[matchId]

import { NextRequest, NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';

export async function GET(
  request: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const db = await getDataLayerAsync();
    const matchId = params.matchId;

    // Get prediction from data layer
    const prediction = await db.getPrediction(matchId);

    if (!prediction) {
      return NextResponse.json(
        { error: 'Predicción no encontrada. Ejecuta /api/cron/recalculate primero.' },
        { status: 404 }
      );
    }

    // Get match details
    const match = await db.getMatch(matchId);

    // Get tournament probabilities
    const probs = await db.getTournamentProbs();

    return NextResponse.json({
      success: true,
      match,
      prediction,
      tournamentProbs: probs.slice(0, 8),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error obteniendo predicción', details: msg },
      { status: 500 }
    );
  }
}
