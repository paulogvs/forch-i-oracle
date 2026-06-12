// FORCH.i ORACLE — API Route: Get Accuracy Metrics
// Returns prediction accuracy stats, match comparisons, and trend data.
// GET /api/accuracy

import { NextResponse } from 'next/server';
import { calculateAccuracy, getMatchComparisons, calculateAccuracyTrend } from '@/lib/accuracy-engine';
import { getDataLayerAsync } from '@/lib/data-layer';

export async function GET() {
  try {
    const [accuracy, comparisons, trend] = await Promise.all([
      calculateAccuracy(),
      getMatchComparisons(),
      calculateAccuracyTrend(),
    ]);

    // Check if we have pre-calculated fixture predictions
    const db = await getDataLayerAsync();
    const allMatches = await db.getAllMatches();
    const predictions = await db.getPredictionsForMatches(allMatches.map(m => m.id));

    return NextResponse.json({
      success: true,
      accuracy,
      comparisons: comparisons.slice(0, 50), // Top 50 for performance
      totalComparisons: comparisons.length,
      trend,
      totalPredictions: predictions.length,
      totalMatches: allMatches.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error calculando precisión', details: msg },
      { status: 500 }
    );
  }
}
