/**
 * FORCH.i ORACLE — Benchmark Scoring Engine
 *
 * Pure functions for evaluating model predictions against actual results.
 * No I/O, no side effects — fully testable.
 *
 * Metrics:
 * - Brier Score: probabilistic calibration (lower = better)
 * - Accuracy 1X2: correct outcome percentage
 * - Exact Score Accuracy: correct score prediction percentage
 * - Simulated ROI: return if betting $1 flat on each prediction
 */

// ═══════════════════════════════════════════════════════════════
// BRIER SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate Brier score for a categorical prediction (H/D/A).
 *
 * Converts the model's pick + confidence into a 3-outcome probability distribution,
 * then computes the mean squared error against the one-hot actual outcome.
 *
 * Lower = better. Minimum = 0 (perfect). Maximum = 2 (always wrong with max confidence).
 *
 * @param predictedOutcome Model's predicted outcome ('H', 'D', or 'A')
 * @param confidence Model's confidence in its pick (0-1)
 * @param actualOutcome The real match outcome
 * @returns Brier score (0 = perfect, 2 = worst)
 */
export function calculateBrierScore(
  predictedOutcome: 'H' | 'D' | 'A',
  confidence: number,
  actualOutcome: 'H' | 'D' | 'A'
): number {
  const p = Math.max(0.001, Math.min(0.999, confidence));

  // Distribute probability: pick gets p, others share (1-p)
  const pH = predictedOutcome === 'H' ? p : (1 - p) / 2;
  const pD = predictedOutcome === 'D' ? p : (1 - p) / 2;
  const pA = predictedOutcome === 'A' ? p : (1 - p) / 2;

  // Normalize to ensure sum = 1
  const sum = pH + pD + pA;
  const nH = pH / sum;
  const nD = pD / sum;
  const nA = pA / sum;

  // One-hot actual
  const yH = actualOutcome === 'H' ? 1 : 0;
  const yD = actualOutcome === 'D' ? 1 : 0;
  const yA = actualOutcome === 'A' ? 1 : 0;

  return Math.pow(nH - yH, 2) + Math.pow(nD - yD, 2) + Math.pow(nA - yA, 2);
}

/**
 * Calculate Brier score for exact score predictions.
 *
 * If the model provides score probabilities, compute MSE over all scores.
 * Otherwise, use a simple 0/1 hit with a prior of ~8% for the predicted score.
 *
 * @param predictedScoreProbs Map of "h-a" → probability (optional)
 * @param actualHomeScore Real home goals
 * @param actualAwayScore Real away goals
 * @returns Brier score for exact score
 */
export function calculateBrierScoreExactScore(
  predictedScoreProbs: Record<string, number> | undefined,
  actualHomeScore: number,
  actualAwayScore: number
): number {
  const actualKey = `${actualHomeScore}-${actualAwayScore}`;

  if (!predictedScoreProbs || Object.keys(predictedScoreProbs).length === 0) {
    // No score probabilities available — can't compute meaningful Brier
    return 0;
  }

  let sum = 0;
  for (const [score, p] of Object.entries(predictedScoreProbs)) {
    const y = score === actualKey ? 1 : 0;
    sum += Math.pow(p - y, 2);
  }
  return sum;
}

// ═══════════════════════════════════════════════════════════════
// ACCURACY
// ═══════════════════════════════════════════════════════════════

/**
 * Check if a predicted outcome matches the actual outcome.
 */
export function isCorrectOutcome(
  predictedOutcome: 'H' | 'D' | 'A',
  actualOutcome: 'H' | 'D' | 'A'
): boolean {
  return predictedOutcome === actualOutcome;
}

/**
 * Check if a predicted score matches the actual score exactly.
 */
export function isCorrectExactScore(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): boolean {
  return predictedHome === actualHome && predictedAway === actualAway;
}

/**
 * Derive outcome from scores.
 */
export function deriveOutcome(homeScore: number, awayScore: number): 'H' | 'D' | 'A' {
  if (homeScore > awayScore) return 'H';
  if (homeScore < awayScore) return 'A';
  return 'D';
}

// ═══════════════════════════════════════════════════════════════
// ROI SIMULATION
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate simulated ROI for flat-staking $1 per prediction.
 *
 * If the model predicts outcome X with confidence p, the implied odds are 1/p.
 * If correct: return = odds - 1. If wrong: return = -1.
 * ROI = total return / number of bets.
 *
 * @param predictions Array of predictions with outcomes
 * @returns ROI as a decimal (e.g., 0.15 = 15% profit)
 */
export function calculateSimulatedROI(
  predictions: Array<{
    predictedOutcome: 'H' | 'D' | 'A';
    confidence: number;
    actualOutcome: 'H' | 'D' | 'A';
  }>
): number {
  if (predictions.length === 0) return 0;

  let totalReturn = 0;
  for (const pred of predictions) {
    const odds = 1 / Math.max(0.01, Math.min(0.99, pred.confidence));
    if (pred.predictedOutcome === pred.actualOutcome) {
      totalReturn += odds - 1;
    } else {
      totalReturn -= 1;
    }
  }
  return totalReturn / predictions.length;
}

// ═══════════════════════════════════════════════════════════════
// WEIGHTED CONSENSUS
// ═══════════════════════════════════════════════════════════════

export interface ConsensusResult {
  outcome: 'H' | 'D' | 'A';
  confidence: number;
  weights: Record<string, number>;
}

/**
 * Calculate weighted consensus from multiple model predictions.
 *
 * If no historical Brier scores are available, all models get equal weight.
 * Otherwise, weight = 1 / (brier + epsilon) — better models weigh more.
 *
 * @param predictions Array of model predictions for a single match
 * @returns Consensus outcome, confidence, and per-model weights
 */
export function calculateWeightedConsensus(
  predictions: Array<{
    modelId: string;
    predictedOutcome: 'H' | 'D' | 'A';
    confidence: number;
    modelBrierScore?: number;
  }>
): ConsensusResult {
  if (predictions.length === 0) {
    return { outcome: 'D', confidence: 0, weights: {} };
  }

  const EPSILON = 0.01;

  // Calculate weights
  const weights: Record<string, number> = {};
  let totalWeight = 0;

  for (const pred of predictions) {
    const w = pred.modelBrierScore !== undefined
      ? 1 / (pred.modelBrierScore + EPSILON)
      : 1; // Uniform weight if no history
    weights[pred.modelId] = w;
    totalWeight += w;
  }

  // Normalize weights
  for (const id of Object.keys(weights)) {
    weights[id] /= totalWeight;
  }

  // Weighted vote per outcome
  const votes = { H: 0, D: 0, A: 0 };
  for (const pred of predictions) {
    const w = weights[pred.modelId];
    votes[pred.predictedOutcome] += w * pred.confidence;
  }

  // Pick outcome with highest weighted vote
  const outcome = (Object.entries(votes) as Array<['H' | 'D' | 'A', number]>)
    .sort((a, b) => b[1] - a[1])[0][0];

  const confidence = votes[outcome] / Object.values(votes).reduce((s, v) => s + v, 0);

  return { outcome, confidence, weights };
}

// ═══════════════════════════════════════════════════════════════
// SCORE CONSENSUS
// ═══════════════════════════════════════════════════════════════

export interface ScoreConsensusEntry {
  score: string;
  count: number;
  probability: number;
  models: string[];
}

/**
 * Calculate score consensus from multiple model predictions.
 * Groups predictions by score and computes frequency.
 *
 * @param predictions Array of model score predictions
 * @returns Sorted array of score consensus entries (highest frequency first)
 */
export function calculateScoreConsensus(
  predictions: Array<{
    predictedHomeScore: number;
    predictedAwayScore: number;
    modelId: string;
  }>
): ScoreConsensusEntry[] {
  if (predictions.length === 0) return [];

  const scoreMap = new Map<string, { count: number; models: string[] }>();

  for (const pred of predictions) {
    const key = `${pred.predictedHomeScore}-${pred.predictedAwayScore}`;
    const existing = scoreMap.get(key) || { count: 0, models: [] };
    existing.count++;
    existing.models.push(pred.modelId);
    scoreMap.set(key, existing);
  }

  const total = predictions.length;

  const entries: ScoreConsensusEntry[] = [];
  scoreMap.forEach((data, score) => {
    entries.push({
      score,
      count: data.count,
      probability: Math.round((data.count / total) * 100),
      models: data.models,
    });
  });

  entries.sort((a, b) => b.count - a.count);
  return entries;
}
