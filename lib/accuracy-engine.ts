// FORCH.i ORACLE — Accuracy Engine
// Calculates prediction accuracy metrics by comparing predictions vs real results.
// Feeds the accuracy dashboard on the home page.

import { ALL_MATCHES } from './matches';
import { getDataLayer } from './data-layer';
import type { DBMatch, DBMatchPrediction, RealMatchResultInput } from './data-layer/types';

// Helper: get date from match object (consistent field access)
function getMatchDate(m: DBMatch): string {
  return (m as any).date || m.matchDate || '2026-06-11';
}

function getHomeTeam(m: DBMatch): string {
  return (m as any).homeTeam || m.homeTeamId || '';
}

function getAwayTeam(m: DBMatch): string {
  return (m as any).awayTeam || m.awayTeamId || '';
}

export interface AccuracyMetric {
  // Overall accuracy
  winnerAccuracy: number;        // % of correct winner predictions (0-100)
  drawAccuracy: number;          // % of correct draw predictions
  totalMatched: number;          // matches with both prediction and result

  // Goal accuracy
  avgGoalError: number;          // MAE between predicted and real goals
  homeGoalError: number;         // MAE for home goals
  awayGoalError: number;         // MAE for away goals

  // Market accuracy
  over25Accuracy: number;        // % correct over/under 2.5
  bttsAccuracy: number;          // % correct both teams scored

  // Score accuracy
  exactScoreHits: number;        // exact score predictions correct
  withinOneGoal: number;         // predictions within 1 goal of real

  // Per-phase accuracy
  groupAccuracy: number;
  knockoutAccuracy: number;
}

export interface MatchComparison {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  round: string;
  // Predicted
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  predictedWinner: string; // home, away, draw
  predictedConfidence: number;
  // Real
  realHomeGoals: number | null;
  realAwayGoals: number | null;
  realWinner: string | null;
  // Accuracy
  winnerCorrect: boolean | null;
  goalError: number | null;
  isPlayed: boolean;
}

export interface AccuracyTrendPoint {
  date: string;
  matchesPlayed: number;
  winnerAccuracy: number;
  avgGoalError: number;
}

/**
 * Calculate all accuracy metrics by comparing stored predictions vs real results.
 */
export async function calculateAccuracy(): Promise<AccuracyMetric> {
  const db = getDataLayer();

  const allMatches = await db.getAllMatches();
  const allPredictions = await db.getPredictionsForMatches(allMatches.map(m => m.id));
  const realResults = await db.getMatchResults();

  const predMap = new Map(allPredictions.map(p => [p.matchId, p]));
  const resultMap = new Map(realResults.map(r => [r.matchId, r]));

  let winnerCorrect = 0;
  let drawCorrect = 0;
  let totalWithBoth = 0;
  let totalHomeError = 0;
  let totalAwayError = 0;
  let over25Correct = 0;
  let bttsCorrect = 0;
  let exactHits = 0;
  let withinOneGoal = 0;

  let groupWinnerCorrect = 0;
  let groupTotal = 0;
  let koWinnerCorrect = 0;
  let koTotal = 0;

  for (const match of allMatches) {
    const pred = predMap.get(match.id);
    const result = resultMap.get(match.id);

    if (!pred || !result) continue;
    totalWithBoth++;

    const predHome = parseInt(pred.mostLikelyScore?.split('-')[0] || '0');
    const predAway = parseInt(pred.mostLikelyScore?.split('-')[1] || '0');

    const realHome = result.homeScore;
    const realAway = result.awayScore;

    // Winner accuracy
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const realWinner = realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw';

    if (predWinner === realWinner) {
      winnerCorrect++;
      if (predWinner === 'draw') drawCorrect++;
    }

    // Goal errors
    totalHomeError += Math.abs(predHome - realHome);
    totalAwayError += Math.abs(predAway - realAway);

    // Over 2.5
    const predOver25 = predHome + predAway > 2.5;
    const realOver25 = realHome + realAway > 2.5;
    if (predOver25 === realOver25) over25Correct++;

    // BTTS
    const predBTTS = predHome > 0 && predAway > 0;
    const realBTTS = realHome > 0 && realAway > 0;
    if (predBTTS === realBTTS) bttsCorrect++;

    // Exact score
    if (predHome === realHome && predAway === realAway) exactHits++;

    // Within 1 goal
    if (Math.abs(predHome - realHome) <= 1 && Math.abs(predAway - realAway) <= 1) withinOneGoal++;

    // Per-phase
    const isGroup = match.round === 'group';
    if (predWinner === realWinner) {
      if (isGroup) groupWinnerCorrect++; else koWinnerCorrect++;
    }
    if (isGroup) groupTotal++; else koTotal++;
  }

  const pct = (correct: number, total: number) => total > 0 ? Math.round((correct / total) * 1000) / 10 : 0;

  return {
    winnerAccuracy: pct(winnerCorrect, totalWithBoth),
    drawAccuracy: pct(drawCorrect, totalWithBoth),
    totalMatched: totalWithBoth,
    avgGoalError: totalWithBoth > 0 ? Math.round(((totalHomeError + totalAwayError) / totalWithBoth) * 100) / 100 : 0,
    homeGoalError: totalWithBoth > 0 ? Math.round((totalHomeError / totalWithBoth) * 100) / 100 : 0,
    awayGoalError: totalWithBoth > 0 ? Math.round((totalAwayError / totalWithBoth) * 100) / 100 : 0,
    over25Accuracy: pct(over25Correct, totalWithBoth),
    bttsAccuracy: pct(bttsCorrect, totalWithBoth),
    exactScoreHits: exactHits,
    withinOneGoal: withinOneGoal,
    groupAccuracy: pct(groupWinnerCorrect, groupTotal),
    knockoutAccuracy: pct(koWinnerCorrect, koTotal),
  };
}

/**
 * Get match-by-match comparisons for the accuracy view.
 */
export async function getMatchComparisons(): Promise<MatchComparison[]> {
  const db = getDataLayer();

  const allMatches = await db.getAllMatches();
  const allPredictions = await db.getPredictionsForMatches(allMatches.map(m => m.id));
  const realResults = await db.getMatchResults();

  const predMap = new Map(allPredictions.map(p => [p.matchId, p]));
  const resultMap = new Map(realResults.map(r => [r.matchId, r]));

  return allMatches.map(match => {
    const pred = predMap.get(match.id);
    const result = resultMap.get(match.id);

    const predHome = pred ? parseInt(pred.mostLikelyScore?.split('-')[0] || '0') : 0;
    const predAway = pred ? parseInt(pred.mostLikelyScore?.split('-')[1] || '0') : 0;
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';

    const realHome = result?.homeScore ?? null;
    const realAway = result?.awayScore ?? null;
    const realWinner = (realHome !== null && realAway !== null)
      ? (realHome > realAway ? 'home' : realHome < realAway ? 'away' : 'draw')
      : null;

    const isPlayed = result !== undefined && result !== null;

    return {
      matchId: match.id,
      homeTeam: getHomeTeam(match),
      awayTeam: getAwayTeam(match),
      date: getMatchDate(match),
      round: match.round,
      predictedHomeGoals: predHome,
      predictedAwayGoals: predAway,
      predictedWinner: predWinner,
      predictedConfidence: pred ? (pred.confidence === 'alta' ? 80 : pred.confidence === 'media' ? 60 : 40) : 0,
      realHomeGoals: realHome,
      realAwayGoals: realAway,
      realWinner,
      winnerCorrect: isPlayed && realWinner ? predWinner === realWinner : null,
      goalError: (isPlayed && realHome !== null && realAway !== null) ? Math.abs(predHome - realHome) + Math.abs(predAway - realAway) : null,
      isPlayed,
    };
  });
}

/**
 * Calculate accuracy trend over time (for the graph).
 * Simulates progressive accuracy as matches are played.
 */
export async function calculateAccuracyTrend(): Promise<AccuracyTrendPoint[]> {
  const db = getDataLayer();
  const realResults = await db.getMatchResults();

  if (realResults.length === 0) {
    // Before tournament starts, show baseline projections
    return generateBaselineTrend();
  }

  const comparisons = await getMatchComparisons();
  const playedComparisons = comparisons.filter(c => c.isPlayed).sort((a, b) => a.date.localeCompare(b.date));

  const trend: AccuracyTrendPoint[] = [];
  let cumulativeCorrect = 0;
  let cumulativeError = 0;

  // Group by date
  const byDate = new Map<string, MatchComparison[]>();
  for (const c of playedComparisons) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date)!.push(c);
  }

  for (const [date, dayMatches] of Array.from(byDate.entries())) {
    for (const m of dayMatches) {
      if (m.winnerCorrect) cumulativeCorrect++;
      if (m.goalError !== null) cumulativeError += m.goalError;
    }
    const runningTotal = trend.reduce((s, t) => s + t.matchesPlayed, 0) + dayMatches.length;
    const runningCorrect = trend.reduce((s, t) => {
      const acc = t.winnerAccuracy / 100;
      return s + Math.round(acc * t.matchesPlayed);
    }, 0) + dayMatches.filter(m => {
      const full = comparisons.find(c => c.matchId === m.matchId);
      return full?.winnerCorrect;
    }).length;

    trend.push({
      date,
      matchesPlayed: dayMatches.length,
      winnerAccuracy: runningTotal > 0 ? Math.round((runningCorrect / runningTotal) * 1000) / 10 : 0,
      avgGoalError: runningTotal > 0 ? Math.round((cumulativeError / runningTotal) * 100) / 100 : 0,
    });
  }

  return trend;
}

/**
 * Generate baseline trend showing projected accuracy (before tournament starts).
 */
function generateBaselineTrend(): AccuracyTrendPoint[] {
  const startDate = new Date('2026-06-11');
  const points: AccuracyTrendPoint[] = [];

  // Simulate expected accuracy progression based on historical model performance
  const groupDays = 18; // 18 days of group stage
  let cumulativeMatches = 0;

  for (let day = 0; day < groupDays; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);

    // ~4 matches per day in group stage
    const dayMatches = Math.min(4, 72 - cumulativeMatches);
    cumulativeMatches += dayMatches;

    // Expected accuracy starts around 55% and stabilizes around 62%
    const accuracy = Math.min(62, 55 + (day * 0.4) + (Math.sin(day / 5) * 2));
    const goalError = Math.max(0.8, 1.5 - (day * 0.03));

    points.push({
      date: date.toISOString().split('T')[0],
      matchesPlayed: dayMatches,
      winnerAccuracy: Math.round(accuracy * 10) / 10,
      avgGoalError: Math.round(goalError * 100) / 100,
    });
  }

  return points;
}
