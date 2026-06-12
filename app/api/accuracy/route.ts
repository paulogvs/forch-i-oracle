// FORCH.i ORACLE — API Route: Get Accuracy Metrics
// Returns prediction accuracy stats, match comparisons, and trend data.
// GET /api/accuracy

import { NextResponse } from 'next/server';
import { calculateAccuracy, getMatchComparisons, calculateAccuracyTrend } from '@/lib/accuracy-engine';
import { calculateStatisticalPrediction } from '@/lib/predictor-engine';
import { ALL_MATCHES } from '@/lib/matches';
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

// POST — Generate all predictions for the tournament (if not already done)
export async function POST() {
  try {
    const db = await getDataLayerAsync();
    const allMatches = await db.getAllMatches();
    const predictions = await db.getPredictionsForMatches(allMatches.map(m => m.id));

    // If we already have predictions, return them
    if (predictions.length >= allMatches.length * 0.8) {
      return NextResponse.json({
        success: true,
        message: `${predictions.length} predicciones ya existentes`,
        total: predictions.length,
      });
    }

    // Generate predictions for all group stage matches
    let generated = 0;
    const groupMatches = allMatches.filter(m => m.round === 'group');

    for (const match of groupMatches) {
      try {
        const homeTeam = match.homeTeamId;
        const awayTeam = match.awayTeamId;

        // Skip if already predicted
        if (predictions.some(p => p.matchId === match.id)) continue;

        const pred = await calculateStatisticalPrediction(homeTeam, awayTeam);

        await db.savePrediction({
          matchId: match.id,
          homeWin: pred.homeWin,
          draw: pred.draw,
          awayWin: pred.awayWin,
          mostLikelyScore: `${pred.predictedScoreHome}-${pred.predictedScoreAway}`,
          expectedGoalsHome: pred.homeExpectedGoals,
          expectedGoalsAway: pred.awayExpectedGoals,
          over25Probability: pred.over25Probability,
          bttsProbability: pred.bttsProbability,
          keyFactors: [],
          confidence: pred.confidence,
          dataQualityScore: 50,
          modelVersion: '2.0',
          homeAttack: pred.homeAttack,
          homeDefense: pred.homeDefense,
          homeMidfield: pred.homeMidfield,
          awayAttack: pred.awayAttack,
          awayDefense: pred.awayDefense,
          awayMidfield: pred.awayMidfield,
          homeElo: pred.homeElo,
          awayElo: pred.awayElo,
          topScores: pred.topScores,
        });

        generated++;
      } catch {
        // Skip failed predictions
      }
    }

    return NextResponse.json({
      success: true,
      message: `${generated} predicciones generadas`,
      total: predictions.length + generated,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: 'Error generando predicciones', details: msg },
      { status: 500 }
    );
  }
}
