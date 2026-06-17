// FORCH.i ORACLE — Shared Tournament Computation
// SINGLE SOURCE OF TRUTH for bracket + championProbs.
// Used by /api/simulate-tournament AND /api/fixture.

import { getDataLayerAsync } from './data-layer';
import { simulateTournamentMulti } from './tournament-sim';

// ═══ IN-MEMORY CACHE ═══
interface CachedResult {
  championProbs: any[];
  top8: any[];
  bracket: any;
  expiresAt: number;
}
let cachedResult: CachedResult | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get or compute tournament results — SINGLE SOURCE OF TRUTH.
 * Both championProbs and bracket come from the SAME simulateTournamentMulti(100) call.
 * Cached in-memory for 5 minutes.
 */
export async function getOrComputeTournamentResults() {
  // Return cached if fresh
  if (cachedResult && Date.now() < cachedResult.expiresAt) {
    return cachedResult;
  }

  const db = await getDataLayerAsync();

  // Try stored data first (from cron or match-result)
  const storedProbs = await db.getTournamentProbs();
  const kvEntry = await db.getKeyValue('consensusBracket');
  const storedBracket = kvEntry?.value || null;

  if (storedProbs.length > 0 && storedBracket) {
    const result: CachedResult = {
      championProbs: storedProbs,
      top8: storedProbs.slice(0, 8).map((p: any) => ({
        team: p.teamId,
        flag: '',
        wins: p.simulationsCount,
        pct: p.championProb,
      })),
      bracket: storedBracket,
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    cachedResult = result;
    return result;
  }

  // No stored data — compute fresh
  console.log('[tournament-results] No stored data, computing fresh...');
  const realResults = await db.getMatchResults();
  const simResults = realResults.map((r: any) => ({
    matchId: r.matchId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    winner: r.winner,
  }));

  const multiResult = await simulateTournamentMulti(100, simResults, () => {});
  // Use bracket from the simulation that produced the most frequent champion
  // (lastBracket is updated in simulateTournamentMulti to track the leader's bracket)
  const bracket = multiResult.bracket;

  // Store for next time
  const probs = multiResult.top8.map((c: any) => ({
    teamId: c.team,
    championProb: c.pct,
    simulationsCount: c.wins,
    totalSimulations: 100,
  }));
  await db.saveTournamentProbs(probs);
  await db.setKeyValue('consensusBracket', bracket);

  const result: CachedResult = {
    championProbs: probs,
    top8: multiResult.top8.slice(0, 8).map((e: any) => ({
      team: e.team, flag: '', wins: e.wins, pct: e.pct,
    })),
    bracket,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  cachedResult = result;
  return result;
}
