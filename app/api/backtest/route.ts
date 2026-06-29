// FORCH.i ORACLE — Backtest API Route
// Returns detailed backtest data: accuracy metrics, Brier scores, calibration,
// and per-round breakdowns.
// GET /api/backtest

import { NextResponse } from 'next/server';
import { calculateAccuracy, getMatchComparisons } from '@/lib/accuracy-engine';
import { calculateBrierScore } from '@/lib/benchmark-scoring';
import { ALL_MATCHES } from '@/lib/matches';
import type { MatchComparison } from '@/lib/accuracy-engine';

interface CalibrationBin {
  binLabel: string;
  binLow: number;
  binHigh: number;
  total: number;
  correct: number;
  accuracy: number;
  avgConfidence: number;
  /** Positive = overconfident (predicted more than actual accuracy), negative = underconfident */
  calibrationError: number;
}

interface BacktestResponse {
  success: boolean;
  overall: {
    totalMatches: number;
    matchesWithBoth: number;
    winnerAccuracy: number;
    goalMAE: number;
    brierScore: number;
    exactScoreHits: number;
    withinOneGoal: number;
  };
  calibration: CalibrationBin[];
  matchComparisons: MatchComparison[];
  byRound: {
    group: { total: number; correct: number; accuracy: number };
    knockout: { total: number; correct: number; accuracy: number };
  };
}

export async function GET() {
  try {
    const accuracy = await calculateAccuracy();
    const comparisons = await getMatchComparisons();
    const played = comparisons.filter(c => c.isPlayed);

    // Overall Brier score (uses actual prediction confidence)
    let totalBrier = 0;
    let brierCount = 0;
    for (const c of played) {
      if (c.realWinner && c.predictedWinner) {
        const predOutcome = c.predictedWinner === 'home' ? 'H' as const
          : c.predictedWinner === 'away' ? 'A' as const : 'D' as const;
        const actualOutcome = c.realWinner === 'home' ? 'H' as const
          : c.realWinner === 'away' ? 'A' as const : 'D' as const;
        const confidence = c.predictedConfidence / 100;
        totalBrier += calculateBrierScore(predOutcome, confidence, actualOutcome);
        brierCount++;
      }
    }

    // Calibration bins: group predictions by confidence level,
    // compare predicted confidence vs actual accuracy.
    const bins: CalibrationBin[] = [];
    for (let b = 0; b < 10; b++) {
      const binLow = b * 10;
      const binHigh = (b + 1) * 10;
      const binMatches = played.filter(c =>
        c.predictedConfidence >= binLow && c.predictedConfidence < binHigh
      );
      if (binMatches.length === 0) continue;

      const binCorrect = binMatches.filter(c => c.winnerCorrect).length;
      const avgConf = binMatches.reduce((s, c) => s + c.predictedConfidence, 0) / binMatches.length;
      const binAccuracy = Math.round((binCorrect / binMatches.length) * 1000) / 10;

      bins.push({
        binLabel: `${binLow}-${binHigh}%`,
        binLow,
        binHigh,
        total: binMatches.length,
        correct: binCorrect,
        accuracy: binAccuracy,
        avgConfidence: Math.round(avgConf * 10) / 10,
        calibrationError: Math.round((avgConf - binAccuracy) * 10) / 10,
      });
    }

    // By round
    const groupMatches = played.filter(c => c.round === 'group');
    const koMatches = played.filter(c => c.round !== 'group');

    const groupCorrect = groupMatches.filter(c => c.winnerCorrect).length;
    const koCorrect = koMatches.filter(c => c.winnerCorrect).length;

    const response: BacktestResponse = {
      success: true,
      overall: {
        totalMatches: ALL_MATCHES.length,
        matchesWithBoth: accuracy.totalMatched,
        winnerAccuracy: accuracy.winnerAccuracy,
        goalMAE: accuracy.avgGoalError,
        brierScore: brierCount > 0 ? Math.round((totalBrier / brierCount) * 1000) / 1000 : 0,
        exactScoreHits: accuracy.exactScoreHits,
        withinOneGoal: accuracy.withinOneGoal,
      },
      calibration: bins,
      matchComparisons: played.slice(0, 128),
      byRound: {
        group: {
          total: groupMatches.length,
          correct: groupCorrect,
          accuracy: groupMatches.length > 0
            ? Math.round((groupCorrect / groupMatches.length) * 100) : 0,
        },
        knockout: {
          total: koMatches.length,
          correct: koCorrect,
          accuracy: koMatches.length > 0
            ? Math.round((koCorrect / koMatches.length) * 100) : 0,
        },
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[backtest] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
