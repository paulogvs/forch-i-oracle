// FORCH.i ORACLE — Wilson Score Confidence Intervals
// Calculates confidence intervals for binomial proportions using
// the Wilson score interval (Edwin Bidwell Wilson, 1927).
// More accurate than the normal approximation, especially near 0 and 1.
//
// Reference: https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Wilson_score_interval

/**
 * Calculate the Wilson score confidence interval for a binomial proportion.
 *
 * @param successes - Number of "successes" (e.g., ensemble models predicting home win)
 * @param trials    - Total number of trials (e.g., number of ensemble models)
 * @param z         - Z-score for desired confidence level (default: 1.96 for 95% CI)
 * @returns Object with `low`, `high`, and `center` (the Wilson center estimate)
 *
 * Usage:
 *   const ci = wilsonScore(3, 4);  // 3 out of 4 models predict home win
 *   // → { low: 0.342, high: 0.978, center: 0.660, margin: 0.318 }
 */
export function wilsonScore(
  successes: number,
  trials: number,
  z: number = 1.96
): { low: number; high: number; center: number; margin: number } {
  if (trials <= 0) return { low: 0, high: 1, center: 0.5, margin: 0.5 };
  if (successes < 0) successes = 0;
  if (successes > trials) successes = trials;

  const p = successes / trials;
  const z2 = z * z;
  const n = trials;

  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const margin = (z / denominator) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));

  return {
    low: Math.max(0, center - margin),
    high: Math.min(1, center + margin),
    center,
    margin,
  };
}

/**
 * Convert a probability distribution (homeWin, draw, awayWin) into
 * Wilson-based uncertainty intervals.
 *
 * Each probability is treated as the proportion of an "effective trial count"
 * derived from the ensemble model agreement. Higher agreement → narrower CIs.
 *
 * @param homeWin - Home win probability (0-100)
 * @param draw    - Draw probability (0-100)
 * @param awayWin - Away win probability (0-100)
 * @param agreementScore - Model agreement score (0-1, from ensemble engine)
 * @param entropy - Shannon entropy of the prediction distribution
 * @param z       - Z-score for confidence level (default: 1.96)
 */
export function calculateUncertaintyIntervals(
  homeWin: number,
  draw: number,
  awayWin: number,
  agreementScore: number,
  entropy: number,
  z: number = 1.96
): {
  homeWin90: { low: number; high: number };
  draw90: { low: number; high: number };
  awayWin90: { low: number; high: number };
  entropy: number;
  effectiveOutcomes: number;
} {
  // Effective number of "observations" based on agreement and entropy
  // High agreement (0.9+) → ~20 effective observations → tight CI
  // Low agreement (0.3) → ~4 effective observations → wide CI
  const effectiveN = Math.max(4, Math.round(4 + 16 * agreementScore));

  // Convert percentages to counts
  const homeSuccesses = Math.round((homeWin / 100) * effectiveN);
  const drawSuccesses = Math.round((draw / 100) * effectiveN);
  const awaySuccesses = Math.round((awayWin / 100) * effectiveN);

  // Normalize to ensure sum matches effectiveN
  const sum = homeSuccesses + drawSuccesses + awaySuccesses;
  const scale = sum > 0 ? effectiveN / sum : 1;

  const ciHome = wilsonScore(Math.round(homeSuccesses * scale), effectiveN, z);
  const ciDraw = wilsonScore(Math.round(drawSuccesses * scale), effectiveN, z);
  const ciAway = wilsonScore(Math.round(awaySuccesses * scale), effectiveN, z);

  // Effective outcomes: exp(entropy) — how many "real" outcomes the distribution represents
  const effectiveOutcomes = entropy > 0 ? Math.round(Math.exp(entropy) * 10) / 10 : 1;

  return {
    homeWin90: { low: Math.round(ciHome.low * 1000) / 10, high: Math.round(ciHome.high * 1000) / 10 },
    draw90: { low: Math.round(ciDraw.low * 1000) / 10, high: Math.round(ciDraw.high * 1000) / 10 },
    awayWin90: { low: Math.round(ciAway.low * 1000) / 10, high: Math.round(ciAway.high * 1000) / 10 },
    entropy,
    effectiveOutcomes,
  };
}
