// FORCH.i ORACLE — API Route: Get Accuracy Metrics
// Returns prediction accuracy metrics, match comparisons, and trend data.
// GET /api/accuracy

import { NextResponse } from 'next/server';
import { calculateAccuracy, getMatchComparisons, calculateAccuracyTrend } from '@/lib/accuracy-engine';
import { getDataLayerAsync } from '@/lib/data-layer';
import { ALL_MATCHES } from '@/lib/matches';

export async function GET() {
  try {
    const [accuracy, comparisons, trend] = await Promise.all([
      calculateAccuracy(),
      getMatchComparisons(),
      calculateAccuracyTrend(),
    ]);

    // Get total match count from static data
    const totalMatches = ALL_MATCHES.length;

    // Try to get prediction count from data layer (graceful fallback)
    let totalPredictions = 0;
    try {
      const db = await getDataLayerAsync();
      const predictions = await db.getPredictionsForMatches(ALL_MATCHES.map(m => m.id));
      totalPredictions = predictions.length;
    } catch {
      // Non-critical
    }

    // Map engine fields to dashboard-expected flat structure
    // Engine returns winnerAccuracy as 0-100%, convert to 0-1 for formatPercent()
    return NextResponse.json({
      success: true,
      winnerAccuracy: (accuracy?.winnerAccuracy ?? 0) / 100, // 0-1 for formatPercent
      goalMAE: accuracy?.avgGoalError ?? 0,
      over25Accuracy: (accuracy?.over25Accuracy ?? 0) / 100, // 0-1 for formatPercent
      matchesPlayed: accuracy?.totalMatched ?? 0,
      comparisons: comparisons.slice(0, 50),
      totalComparisons: comparisons.length,
      trend,
      totalPredictions,
      totalMatches,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[accuracy] Error:', msg);

    // Return graceful empty state instead of 500
    return NextResponse.json({
      success: true,
      winnerAccuracy: 0,
      goalMAE: 0,
      over25Accuracy: 0,
      matchesPlayed: 0,
      comparisons: [],
      totalComparisons: 0,
      trend: [],
      totalPredictions: 0,
      totalMatches: 128,
      message: 'Esperando resultados reales para calcular precision',
    });
  }
}
