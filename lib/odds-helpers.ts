// FORCH.i ORACLE — Market Odds Helpers
// Standalone utilities extracted from espn-api.ts to avoid circular dependencies
// after removing external API modules.

/**
 * Convert American moneyline odds to implied probability.
 * Example: -150 → 60%, +200 → 33.3%
 */
export function americanToImpliedProbability(americanOdds: string): number {
  const odds = parseInt(americanOdds.replace(/[+-]/, ''));
  if (isNaN(odds)) return 0;
  if (americanOdds.startsWith('-')) {
    return odds / (odds + 100); // favorite
  }
  return 100 / (odds + 100); // underdog
}

/**
 * Convert implied probability to European decimal odds.
 */
export function impliedProbabilityToDecimal(prob: number): number {
  if (prob <= 0) return 99;
  return Math.round((1 / prob) * 100) / 100;
}
