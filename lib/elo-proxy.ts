/**
 * FORCH.i ORACLE — Dynamic Elo Proxy
 *
 * Takes the static Elo ratings from teams.ts and applies runtime adjustments
 * based on momentum, fatigue, injuries, and home advantage.
 *
 * ELO_RATINGS is never modified — only read.
 * The proxy is computational per-request and not persisted.
 */

import { getElo, type StatisticalPrediction } from './predictor-engine';
import type { EloEntry } from './teams';

export interface ProxyContext {
  /** Momentum from enhanced engine: -1.0 (bad streak) to +1.0 (good streak) */
  momentum?: number;
  /** Fatigue adjustment: -0.15 (very tired) to +0.05 (well-rested) */
  fatigue?: number;
  /** Injury impact: 0 (no injuries) to -0.25 (many key players out) */
  injuryImpact?: number;
  /** Home advantage bonus: 0 to +0.08 (host nation) */
  homeAdvantage?: number;
}

export interface DynamicEloResult {
  /** Adjusted Elo rating */
  elo: number;
  /** Adjusted attack strength */
  attack: number;
  /** Adjusted defense strength (inverted: higher = better defense) */
  defense: number;
}

/**
 * Get dynamic Elo for a team based on context adjustments.
 *
 * When context is undefined, returns the exact base values.
 * Adjustments are clamped to ±10% of base Elo (±150 pts for a 1500-rated team).
 *
 * @param teamName Team name (must exist in ELO_RATINGS or use defaults)
 * @param context Optional runtime context for adjustments
 * @returns Adjusted Elo, attack, and defense values
 */
export function getDynamicElo(
  teamName: string,
  context?: ProxyContext
): DynamicEloResult {
  const base: EloEntry = getElo(teamName);

  if (!context) {
    return { elo: base.elo, attack: base.attack, defense: base.defense };
  }

  let multiplier = 1.0;

  // Momentum: ±1.0 → ±3% of Elo
  if (context.momentum !== undefined) {
    multiplier += context.momentum * 0.03;
  }

  // Fatigue: -0.15 to +0.05 → -4.5% to +1.5%
  if (context.fatigue !== undefined) {
    multiplier += context.fatigue * 0.30;
  }

  // Injuries: 0 to -0.25 → 0% to -6.25%
  if (context.injuryImpact !== undefined) {
    multiplier += context.injuryImpact * 0.25;
  }

  // Clamp to ±10%
  multiplier = Math.max(0.90, Math.min(1.10, multiplier));

  return {
    elo: Math.round(base.elo * multiplier),
    attack: Math.round(base.attack * multiplier * 100) / 100,
    // Defense improves (fewer goals conceded) when team is stronger
    defense: Math.round((base.defense / multiplier) * 100) / 100,
  };
}
