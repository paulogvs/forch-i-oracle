// FORCH.i ORACLE — Model Disagreement & Scoring Utilities
// Inspired by WorldCupBench (mverab/WorldCupBench)
//
// Brier Score: measures calibration quality of probabilistic predictions
//   - Lower = better (0.0 = perfect, 2.0 = worst for 3-class)
//   - Random guessing (0.33/0.33/0.33) = 0.667
//
// Quiniela Points: escalating point system for tournament bracket picks
//   - Group=1, R32=2, R16=4, QF=8, SF=16, Final=32
//
// Model Disagreement: how much do the 4 ensemble models disagree?
//   - Higher std dev = models disagree more = lower confidence

// ═══════════════════════════════════════════════════════════════
// BRIER SCORE
// ═══════════════════════════════════════════════════════════════

/**
 * Multi-class Brier score for group stage (3 outcomes: home/draw/away).
 * Brier = Σ(p_i - y_i)² where y_i is 1 for the actual outcome, 0 otherwise.
 * Range: 0.0 (perfect) to 2.0 (worst)
 */
export function brierGroupScore(
  homeProb: number,
  drawProb: number,
  awayProb: number,
  actual: 'home' | 'draw' | 'away'
): number {
  const probs = { home: homeProb / 100, draw: drawProb / 100, away: awayProb / 100 };
  return (
    (probs.home - (actual === 'home' ? 1 : 0)) ** 2 +
    (probs.draw - (actual === 'draw' ? 1 : 0)) ** 2 +
    (probs.away - (actual === 'away' ? 1 : 0)) ** 2
  );
}

/**
 * Binary Brier score for knockout matches (winner-only, no draws possible).
 * Only scores the probability assigned to the predicted winner.
 */
export function brierKnockoutScore(
  predictedWinnerProb: number,
  predictedWon: boolean
): number {
  return (predictedWinnerProb / 100 - (predictedWon ? 1 : 0)) ** 2;
}

// ═══════════════════════════════════════════════════════════════
// QUINIELA POINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Quiniela points per stage — geometric progression:
 * Group=1, R32=2, R16=4, QF=8, SF=16, Final=32
 */
export const QUINIELA_POINTS: Record<string, number> = {
  group: 1,
  'round-32': 2,
  R32: 2,
  'round-16': 4,
  R16: 4,
  quarter: 8,
  QF: 8,
  semi: 16,
  SF: 16,
  third: 8,
  final: 32,
};

/**
 * Get quiniela points for a correctly predicted match.
 */
export function getQuinielaPoints(round: string): number {
  return QUINIELA_POINTS[round] || 1;
}

// ═══════════════════════════════════════════════════════════════
// DISAGREEMENT LEVELS
// ═══════════════════════════════════════════════════════════════

export type DisagreementLevel = 'alta' | 'media' | 'baja';

/**
 * Interpret agreement score as a human-readable level.
 * agreementScore: 0 (no agreement) to 1 (perfect agreement)
 */
export function getDisagreementLevel(agreementScore: number): {
  level: DisagreementLevel;
  label: string;
  color: string;
} {
  if (agreementScore >= 0.85) {
    return { level: 'alta', label: 'Alto acuerdo', color: 'green' };
  } else if (agreementScore >= 0.6) {
    return { level: 'media', label: 'Acuerdo moderado', color: 'yellow' };
  }
  return { level: 'baja', label: 'Alto desacuerdo', color: 'red' };
}

// ═══════════════════════════════════════════════════════════════
// ENTROPY INTERPRETATION
// ═══════════════════════════════════════════════════════════════

/**
 * Interpret entropy value as match uncertainty.
 * entropy range: 0 (completely certain) to 1.58 (max uncertainty for 3 outcomes)
 */
export function interpretEntropy(entropy: number): {
  certainty: string;
  description: string;
} {
  if (entropy < 0.5) {
    return { certainty: 'alta', description: 'Resultado muy claro' };
  } else if (entropy < 1.0) {
    return { certainty: 'media', description: 'Resultado probable pero no seguro' };
  } else if (entropy < 1.35) {
    return { certainty: 'baja', description: 'Resultado incierto' };
  }
  return { certainty: 'muy-baja', description: 'Partido totalmente abierto' };
}

// ═══════════════════════════════════════════════════════════════
// MODEL COMPARISON
// ═══════════════════════════════════════════════════════════════

/**
 * Which model is most confident in its prediction?
 * Returns the model name with the highest probability for its predicted outcome.
 */
export function getMostConfidentModel(
  models?: {
    dixonColes?: { homeWin: number; draw: number; awayWin: number };
    eloPoisson?: { homeWin: number; draw: number; awayWin: number };
    bayesian?: { homeWin: number; draw: number; awayWin: number };
    purePoisson?: { homeWin: number; draw: number; awayWin: number };
  }
): { name: string; maxProb: number } | null {
  if (!models) return null;

  const maxProbs: Record<string, number> = {};
  for (const [name, m] of Object.entries(models)) {
    if (m) {
      maxProbs[name] = Math.max(m.homeWin, m.draw, m.awayWin);
    }
  }

  const best = Object.entries(maxProbs).sort((a, b) => b[1] - a[1])[0];
  if (!best) return null;
  return { name: best[0], maxProb: best[1] };
}
