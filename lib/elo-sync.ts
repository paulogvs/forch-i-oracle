// FORCH.i ORACLE — Live Elo Synchronization
// ═══════════════════════════════════════════════════════════════
// SINGLE SOURCE OF TRUTH for all Elo ratings across the app.
//
// This module maintains a module-level cache of live Elo ratings
// that ALL engines MUST read from instead of importing ELO_RATINGS
// directly from teams.ts.
//
// Flow:
//   match-result/route.ts
//     → elo-update.ts::processMatchEloUpdate()
//       → elo-sync.ts::setLiveElo()  ← writes updated Elo HERE
//     → ALL engines read via getLiveElo()  ← reads from HERE
//
// On cold start, the cache is seeded from static ELO_RATINGS.
// Every time a match result is processed, the cache is updated.
// This creates a TRUE closed loop: result → Elo update → prediction.
// ═══════════════════════════════════════════════════════════════

import { ELO_RATINGS, type EloEntry } from './teams';

// ═══════════════════════════════════════════════════════════════
// MODULE-LEVEL LIVE ELO CACHE
// ═══════════════════════════════════════════════════════════════

/** In-memory live Elo cache. Seeded from ELO_RATINGS on import. */
const liveElo: Map<string, EloEntry> = new Map();

/** Seed the cache from static ELO_RATINGS on module load */
function initializeFromStatic(): void {
  for (const [teamName, entry] of Object.entries(ELO_RATINGS)) {
    liveElo.set(teamName, { ...entry });
  }
}

// Initialize immediately on module load
initializeFromStatic();

// ═══════════════════════════════════════════════════════════════
// EXPORTED FUNCTIONS — Use these from ALL engines
// ═══════════════════════════════════════════════════════════════

/**
 * Get the latest Elo for a team.
 * Checks the live cache first, then falls back to static ELO_RATINGS.
 *
 * THIS is the single entry point for ALL Elo lookups across the app.
 * Every engine must use this instead of importing ELO_RATINGS directly.
 *
 * @param teamName Team name in Spanish (e.g., "Argentina")
 * @returns EloEntry with elo, attack, defense
 */
export function getLiveElo(teamName: string): EloEntry {
  const cached = liveElo.get(teamName);
  if (cached) return cached;

  // Fallback to static (shouldn't happen if teams.ts is in sync)
  const staticEntry = ELO_RATINGS[teamName];
  if (staticEntry) {
    liveElo.set(teamName, { ...staticEntry });
    return staticEntry;
  }

  // Absolute fallback for unknown teams
  return { elo: 1500, attack: 1.0, defense: 1.0 };
}

/**
 * Update the live Elo for a team after a match result.
 * Called by elo-update.ts::processMatchEloUpdate().
 *
 * @param teamName Team name in Spanish
 * @param entry Updated EloEntry (elo, attack, defense)
 */
export function setLiveElo(teamName: string, entry: EloEntry): void {
  liveElo.set(teamName, { ...entry });
}

/**
 * Get ALL live Elo ratings as a Record (for API responses, debugging).
 * Merged view: live cache values override static values.
 */
export function getAllLiveElos(): Record<string, EloEntry> {
  const result: Record<string, EloEntry> = {};

  // Start with all static entries (covers teams that haven't been updated)
  for (const [teamName, entry] of Object.entries(ELO_RATINGS)) {
    result[teamName] = { ...entry };
  }

  // Override with live cache values
  liveElo.forEach((entry, teamName) => {
    result[teamName] = { ...entry };
  });

  return result;
}

/**
 * Reset the live cache back to static ELO_RATINGS.
 * Useful for testing or after a full tournament reset.
 */
export function resetLiveElo(): void {
  liveElo.clear();
  initializeFromStatic();
}

/**
 * Get the number of teams with live Elo updates applied
 * (teams whose Elo differs from the static value).
 */
export function getLiveEloUpdateCount(): number {
  let count = 0;
  liveElo.forEach((entry, teamName) => {
    const staticEntry = ELO_RATINGS[teamName];
    if (!staticEntry) { count++; return; }
    if (entry.elo !== staticEntry.elo) count++;
  });
  return count;
}
