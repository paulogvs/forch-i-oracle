// FORCH.i ORACLE — Persistent Elo Update Engine
// Updates team Elo ratings after each real match result.
// Ratings are persisted to KV store and merged with static ELO_RATINGS at read time.
//
// Formula: Elo_new = Elo_old + K × (actual - expected)
// K = 20 for group stage, 30 for knockout stage

import { ELO_RATINGS, type EloEntry } from './teams';
import type { IDataLayer } from './data-layer/interface';

/** K-factor: higher in knockout (more decisive matches) */
const K_GROUP = 20;
const K_KNOCKOUT = 30;

/** Expected score from Elo difference */
function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + Math.pow(10, (eloB - eloA) / 400));
}

/**
 * Calculate new Elo ratings for both teams after a match.
 *
 * @param homeElo Current Elo of home team
 * @param awayElo Current Elo of away team
 * @param homeScore Actual home goals
 * @param awayScore Actual away goals
 * @param isKnockout Whether this is a knockout match (higher K)
 * @returns Updated Elo ratings for both teams
 */
export function calculateEloUpdate(
  homeElo: number,
  awayElo: number,
  homeScore: number,
  awayScore: number,
  isKnockout: boolean = false,
): { newHomeElo: number; newAwayElo: number; homeDelta: number; awayDelta: number } {
  const K = isKnockout ? K_KNOCKOUT : K_GROUP;

  // Actual result: 1 = win, 0.5 = draw, 0 = loss
  const homeActual = homeScore > awayScore ? 1 : homeScore < awayScore ? 0 : 0.5;
  const awayActual = 1 - homeActual;

  // Expected scores
  const homeExpected = expectedScore(homeElo, awayElo);
  const awayExpected = expectedScore(awayElo, homeElo);

  // Goal difference multiplier (margin of victory bonus)
  const goalDiff = Math.abs(homeScore - awayScore);
  const multiplier = goalDiff <= 1 ? 1 : Math.min(1.5, 1 + (goalDiff - 1) * 0.1);

  // Calculate deltas
  const homeDelta = Math.round(K * multiplier * (homeActual - homeExpected));
  const awayDelta = Math.round(K * multiplier * (awayActual - awayExpected));

  return {
    newHomeElo: homeElo + homeDelta,
    newAwayElo: awayElo + awayDelta,
    homeDelta,
    awayDelta,
  };
}

/**
 * Get current Elo for a team, checking overrides first, then falling back to static ratings.
 * This is the SINGLE ENTRY POINT for all Elo lookups.
 */
export async function getCurrentElo(
  teamName: string,
  db: IDataLayer,
): Promise<EloEntry> {
  // Check for persistent override
  const override = await db.getKeyValue(`eloOverride:${teamName}`);
  if (override && typeof override.value === 'object' && override.value !== null) {
    const val = override.value as Partial<EloEntry>;
    return {
      elo: val.elo ?? ELO_RATINGS[teamName]?.elo ?? 1500,
      attack: val.attack ?? ELO_RATINGS[teamName]?.attack ?? 1.0,
      defense: val.defense ?? ELO_RATINGS[teamName]?.defense ?? 1.0,
    };
  }

  // Fallback to static ratings
  return ELO_RATINGS[teamName] || { elo: 1500, attack: 1.0, defense: 1.0 };
}

/**
 * Persist Elo overrides for a team after a match.
 * Also adjusts attack/defense based on the match outcome.
 */
export async function persistEloUpdate(
  teamName: string,
  newElo: number,
  goalsScored: number,
  goalsConceded: number,
  db: IDataLayer,
): Promise<void> {
  const current = await getCurrentElo(teamName, db);

  // Adjust attack/defense ratings based on this match
  // Smooth moving average: 90% old + 10% new observation
  const newAttack = current.attack * 0.9 + (goalsScored / Math.max(1, goalsScored + goalsConceded)) * 0.1 * 3;
  const newDefense = current.defense * 0.9 + (goalsConceded / Math.max(1, goalsScored + goalsConceded)) * 0.1 * 3;

  await db.setKeyValue(`eloOverride:${teamName}`, {
    elo: newElo,
    attack: Math.max(0.3, Math.min(4.0, newAttack)),
    defense: Math.max(0.3, Math.min(4.0, newDefense)),
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Process a match result and update both teams' Elo ratings.
 * This is called from /api/match-result after recording the score.
 */
export async function processMatchEloUpdate(
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  isKnockout: boolean,
  db: IDataLayer,
): Promise<{
  homeEloBefore: number;
  awayEloBefore: number;
  homeEloAfter: number;
  awayEloAfter: number;
  homeDelta: number;
  awayDelta: number;
}> {
  const homeCurrent = await getCurrentElo(homeTeam, db);
  const awayCurrent = await getCurrentElo(awayTeam, db);

  const { newHomeElo, newAwayElo, homeDelta, awayDelta } = calculateEloUpdate(
    homeCurrent.elo,
    awayCurrent.elo,
    homeScore,
    awayScore,
    isKnockout,
  );

  // Persist both teams
  await persistEloUpdate(homeTeam, newHomeElo, homeScore, awayScore, db);
  await persistEloUpdate(awayTeam, newAwayElo, awayScore, homeScore, db);

  console.log(`[elo-update] ${homeTeam}: ${homeCurrent.elo} → ${newHomeElo} (${homeDelta >= 0 ? '+' : ''}${homeDelta})`);
  console.log(`[elo-update] ${awayTeam}: ${awayCurrent.elo} → ${newAwayElo} (${awayDelta >= 0 ? '+' : ''}${awayDelta})`);

  return {
    homeEloBefore: homeCurrent.elo,
    awayEloBefore: awayCurrent.elo,
    homeEloAfter: newHomeElo,
    awayEloAfter: newAwayElo,
    homeDelta,
    awayDelta,
  };
}
