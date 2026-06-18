// FORCH.i ORACLE — Market Odds Model (5th model in ensemble)
// Converts DraftKings moneyline odds to probabilities and uses them
// as a 5th signal in the ensemble prediction.
//
// Logic: Bookmakers have strong incentives to set accurate odds
// (their margin is ~4-5% regardless of outcome). The market's implied
// probabilities are a powerful baseline that captures public sentiment,
// injury news, and sharp money.

import { americanToImpliedProbability } from './espn-api';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MarketOddsPrediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  overUnderLine: number | null;
  modelConfidence: number; // 0-1, based on data quality
}

export interface MarketComparison {
  oracleHomeWin: number;
  marketHomeWin: number;
  oracleDraw: number;
  marketDraw: number;
  oracleAwayWin: number;
  marketAwayWin: number;
  homeDivergence: number; // positive = ORACLE more bullish on home
  drawDivergence: number;
  awayDivergence: number;
  biggestDivergence: string; // 'home' | 'draw' | 'away'
  marketEdge: 'home-value' | 'away-value' | 'draw-value' | 'none';
}

// ═══════════════════════════════════════════════════════════════
// ODDS → PROBABILITY CONVERSION
// ═══════════════════════════════════════════════════════════════

/**
 * Convert moneyline odds to normalized 1X2 probabilities (0-100).
 * Removes bookmaker margin (vig/juice) via multiplicative method.
 */
export function moneylineTo1X2(
  homeOdds: string,
  drawOdds: string,
  awayOdds: string
): MarketOddsPrediction | null {
  const homeProb = americanToImpliedProbability(homeOdds);
  const drawProb = americanToImpliedProbability(drawOdds);
  const awayProb = AmericanToImpliedProbability(awayOdds);

  const total = homeProb + drawProb + awayProb;
  if (total <= 0 || total > 2) return null; // Sanity check

  // Remove margin: divide each by total (multiplicative method)
  const margin = total - 1; // ~0.04 to 0.06 typically

  return {
    homeWin: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    awayWin: Math.round((awayProb / total) * 100),
    overUnderLine: null,
    modelConfidence: Math.max(0.3, Math.min(1.0, 1.0 - margin * 5)), // Lower margin = higher confidence
  };
}

// Helper for the typo above
function AmericanToImpliedProbability(odds: string): number {
  return americanToImpliedProbability(odds);
}

/**
 * Blend market odds with ensemble using a weighted average.
 * Market gets ~15% weight (conservative, since we don't know the exact line).
 */
export function blendMarketWithEnsemble(
  ensembleHomeWin: number,
  ensembleDraw: number,
  ensembleAwayWin: number,
  market: MarketOddsPrediction
): { homeWin: number; draw: number; awayWin: number } {
  const MARKET_WEIGHT = 0.15;
  const ENSEMBLE_WEIGHT = 1 - MARKET_WEIGHT;

  const blendedHome = Math.round(
    ensembleHomeWin * ENSEMBLE_WEIGHT + market.homeWin * MARKET_WEIGHT
  );
  const blendedDraw = Math.round(
    ensembleDraw * ENSEMBLE_WEIGHT + market.draw * MARKET_WEIGHT
  );
  const blendedAway = 100 - blendedHome - blendedDraw;

  return {
    homeWin: Math.max(2, Math.min(85, blendedHome)),
    draw: Math.max(5, Math.min(40, blendedDraw)),
    awayWin: Math.max(2, Math.min(85, blendedAway)),
  };
}

// ═══════════════════════════════════════════════════════════════
// DIVERGENCE ANALYSIS
// ═══════════════════════════════════════════════════════════════

/**
 * Compare ORACLE predictions vs market odds to find value bets.
 * Divergence > 8% = significant disagreement.
 */
export function compareOracleVsMarket(
  oracle: { homeWin: number; draw: number; awayWin: number },
  market: { homeWin: number; draw: number; awayWin: number }
): MarketComparison {
  const homeDiv = oracle.homeWin - market.homeWin;
  const drawDiv = oracle.draw - market.draw;
  const awayDiv = oracle.awayWin - market.awayWin;

  const absHome = Math.abs(homeDiv);
  const absDraw = Math.abs(drawDiv);
  const absAway = Math.abs(awayDiv);

  const biggest = absHome >= absDraw && absHome >= absAway ? 'home' :
    absDraw >= absAway ? 'draw' : 'away';

  // Value detection: ORACLE says probability is higher than market implies
  let marketEdge: MarketComparison['marketEdge'] = 'none';
  if (homeDiv > 8 && oracle.homeWin > market.homeWin + 8) marketEdge = 'home-value';
  else if (awayDiv > 8 && oracle.awayWin > market.awayWin + 8) marketEdge = 'away-value';
  else if (drawDiv > 5 && oracle.draw > market.draw + 5) marketEdge = 'draw-value';

  return {
    oracleHomeWin: oracle.homeWin,
    marketHomeWin: market.homeWin,
    oracleDraw: oracle.draw,
    marketDraw: market.draw,
    oracleAwayWin: oracle.awayWin,
    marketAwayWin: market.awayWin,
    homeDivergence: homeDiv,
    drawDivergence: drawDiv,
    awayDivergence: awayDiv,
    biggestDivergence: biggest,
    marketEdge,
  };
}

/**
 * Get human-readable divergence analysis text (Spanish).
 */
export function getDivergenceText(comparison: MarketComparison): string {
  const { biggestDivergence, marketEdge } = comparison;

  if (marketEdge === 'none') {
    return 'ORACLE y el mercado coinciden en gran medida.';
  }

  if (marketEdge === 'home-value') {
    return `ORACLE ve más valor en ${biggestDivergence === 'home' ? 'local' : 'empate'} (${comparison.homeDivergence > 0 ? '+' : ''}${comparison.homeDivergence}% vs mercado). Posible oportunidad de valor.`;
  }

  if (marketEdge === 'away-value') {
    return `ORACLE valora más al visitante (${comparison.awayDivergence > 0 ? '+' : ''}${comparison.awayDivergence}% vs mercado). Divergencia significativa.`;
  }

  if (marketEdge === 'draw-value') {
    return `ORACLE asigna más probabilidad de empate (${comparison.drawDivergence > 0 ? '+' : ''}${comparison.drawDivergence}% vs mercado). El mercado subestima el empate.`;
  }

  return '';
}
