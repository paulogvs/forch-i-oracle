/**
 * FORCH.i ORACLE — Dixon-Coles Model for Football Score Probabilities
 *
 * Extends the standard independent Poisson model by applying a dependency
 * correction factor τ(h, a) to low-score outcomes (0-0, 1-0, 0-1, 1-1).
 * This accounts for the empirical observation that low-scoring draws
 * (especially 0-0 and 1-1) occur more frequently than independent Poisson predicts.
 *
 * Reference: Dixon & Coles (1997) "Modelling Association Football Scores
 * and Inefficiencies in the Football Betting Market"
 *
 * The τ factor:
 *   τ(0,0) = 1 - λ·μ·ρ
 *   τ(1,0) = 1 + λ·ρ
 *   τ(0,1) = 1 + μ·ρ
 *   τ(1,1) = 1 - ρ
 *   τ(h,a) = 1  for h > 1 or a > 1
 *
 * where λ = home expected goals, μ = away expected goals,
 * and ρ (rho) is the dependency parameter.
 */

/** Dependency parameter. Typical values: -0.08 to -0.13 for international football. */
export const RHO = -0.10;

/**
 * Phase-dependent RHO: knockout matches have lower draw probability
 * (more aggressive play), so rho is weaker (less draw correction).
 */
export function getPhaseRho(phase: 'group' | 'knockout'): number {
  return phase === 'knockout' ? -0.06 : RHO;
}

/**
 * Dixon-Coles τ correction factor for a specific score (h, a).
 *
 * @param lambda Home expected goals
 * @param mu Away expected goals
 * @param h Home goals
 * @param a Away goals
 * @param rho Dependency parameter (default: RHO)
 * @returns Multiplicative correction factor
 */
export function tau(
  lambda: number,
  mu: number,
  h: number,
  a: number,
  rho: number = RHO
): number {
  if (h > 1 || a > 1) return 1;
  if (h === 0 && a === 0) return Math.max(0.1, 1 - lambda * mu * rho);
  if (h === 1 && a === 0) return 1 + lambda * rho;
  if (h === 0 && a === 1) return 1 + mu * rho;
  if (h === 1 && a === 1) return 1 - rho;
  return 1;
}

/**
 * Poisson probability: P(X = k) = (λ^k · e^-λ) / k!
 * Uses recursive computation from P(0) for numerical stability.
 *
 * @param lambda Expected value (λ)
 * @param k Count (k)
 * @returns Poisson probability
 */
export function poissonProbability(lambda: number, k: number): number {
  if (k < 0) return 0;
  // Recursive: P(k) = P(0) · λ^k / k!
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    p *= lambda / i;
  }
  return p;
}

/**
 * Precomputed factorial table for common values (0-20).
 * Used to avoid redundant factorial calculations in Poisson PMF.
 */
const FACTORIAL_TABLE: number[] = [1];
for (let i = 1; i <= 20; i++) {
  FACTORIAL_TABLE[i] = FACTORIAL_TABLE[i - 1] * i;
}

/**
 * Fast Poisson PMF using precomputed factorials for k ≤ 20.
 * Falls back to recursive computation for larger values.
 */
export function poissonPMFFast(lambda: number, k: number): number {
  if (k < 0) return 0;
  if (k <= 20) {
    return Math.exp(-lambda) * Math.pow(lambda, k) / FACTORIAL_TABLE[k];
  }
  // Fallback for rare high-score cases
  return poissonProbability(lambda, k);
}

export interface DixonColesResult {
  /** Home win probability (0-100, integer) */
  homeWin: number;
  /** Draw probability (0-100, integer) */
  draw: number;
  /** Away win probability (0-100, integer) */
  awayWin: number;
  /** Most likely home score */
  predictedScoreHome: number;
  /** Most likely away score */
  predictedScoreAway: number;
  /** Score probability matrix: scoreMatrix[h][a] = P(home=h, away=a) */
  scoreMatrix: number[][];
  /** Over 2.5 goals probability (0-100) */
  over25: number;
  /** Both teams to score probability (0-100) */
  btts: number;
  /** Exact home expected goals (derived from matrix) */
  homeExpectedGoals: number;
  /** Exact away expected goals (derived from matrix) */
  awayExpectedGoals: number;
  /** Top 5 most probable scores */
  topScores: { home: number; away: number; probability: number }[];
}

/**
 * Calculate match probabilities using the Dixon-Coles dependent Poisson model.
 *
 * Steps:
 * 1. Compute independent Poisson probabilities for each (h, a) cell
 * 2. Apply τ(h, a) correction to low-score cells
 * 3. Normalize all cells so total probability = 1
 * 4. Derive 1X2, Over 2.5, BTTS from the normalized matrix
 * 5. Extract top 5 scores and compute exact expected goals
 *
 * @param homeLambda Home expected goals (λ)
 * @param awayLambda Away expected goals (μ)
 * @param maxGoals Maximum goals to consider per side (default: 7, i.e., 0-6)
 * @param rho Dependency parameter (default: RHO = -0.10)
 * @returns Complete probability breakdown
 */
export function calculateMatchProbabilitiesDixonColes(
  homeLambda: number,
  awayLambda: number,
  maxGoals: number = 7,
  rho: number = RHO
): DixonColesResult {
  // Step 1 & 2: Compute corrected probabilities
  let totalRaw = 0;
  const rawMatrix: number[][] = [];

  for (let h = 0; h < maxGoals; h++) {
    rawMatrix[h] = [];
    for (let a = 0; a < maxGoals; a++) {
      const pPoisson = poissonProbability(homeLambda, h) * poissonProbability(awayLambda, a);
      const pCorrected = pPoisson * tau(homeLambda, awayLambda, h, a, rho);
      rawMatrix[h][a] = Math.max(0, pCorrected); // Clamp negatives
      totalRaw += rawMatrix[h][a];
    }
  }

  // Step 3: Normalize so total = 1
  const scoreMatrix: number[][] = [];
  for (let h = 0; h < maxGoals; h++) {
    scoreMatrix[h] = [];
    for (let a = 0; a < maxGoals; a++) {
      scoreMatrix[h][a] = totalRaw > 0 ? rawMatrix[h][a] / totalRaw : 0;
    }
  }

  // Step 4: Derive 1X2, Over 2.5, BTTS
  let homeWin = 0;
  let draw = 0;
  let awayWin = 0;
  let over25 = 0;
  let btts = 0;

  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      const p = scoreMatrix[h][a];
      if (h > a) homeWin += p;
      else if (h === a) draw += p;
      else awayWin += p;

      if (h + a > 2.5) over25 += p;
      if (h > 0 && a > 0) btts += p;
    }
  }

  // Normalize 1X2 to integers summing to 100
  const hwPct = Math.round(homeWin * 100);
  const drPct = Math.round(draw * 100);
  const awPct = 100 - hwPct - drPct;

  // Step 5: Most likely score (MAP)
  let maxProb = 0;
  let mapHome = 0;
  let mapAway = 0;
  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      if (scoreMatrix[h][a] > maxProb) {
        maxProb = scoreMatrix[h][a];
        mapHome = h;
        mapAway = a;
      }
    }
  }

  // Step 6: Top 5 scores
  const allScores: { home: number; away: number; probability: number }[] = [];
  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      allScores.push({ home: h, away: a, probability: Math.round(scoreMatrix[h][a] * 1000) / 10 });
    }
  }
  allScores.sort((a, b) => b.probability - a.probability);
  const topScores = allScores.slice(0, 5);

  // Step 7: Exact expected goals from matrix
  let exactHomeXG = 0;
  let exactAwayXG = 0;
  for (let h = 0; h < maxGoals; h++) {
    for (let a = 0; a < maxGoals; a++) {
      const p = scoreMatrix[h][a];
      exactHomeXG += h * p;
      exactAwayXG += a * p;
    }
  }

  return {
    homeWin: hwPct,
    draw: drPct,
    awayWin: Math.max(0, awPct),
    predictedScoreHome: mapHome,
    predictedScoreAway: mapAway,
    scoreMatrix,
    over25: Math.round(over25 * 100),
    btts: Math.round(btts * 100),
    homeExpectedGoals: Math.round(exactHomeXG * 100) / 100,
    awayExpectedGoals: Math.round(exactAwayXG * 100) / 100,
    topScores,
  };
}
