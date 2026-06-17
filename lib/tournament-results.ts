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
let cachedResultsHash: string | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get or compute tournament results — SINGLE SOURCE OF TRUTH.
 * Both championProbs and bracket come from the SAME simulateTournamentMulti(100) call.
 * Cached in-memory and in DB, auto-invalidated when realResults change.
 */
export async function getOrComputeTournamentResults() {
  const db = await getDataLayerAsync();

  const realResults = await db.getMatchResults();
  const resultsHash = realResults
    .map((r: any) => `${r.matchId}:${r.homeScore}-${r.awayScore}`)
    .join('|');

  // Return cached if fresh and results hash matches
  if (cachedResult && cachedResultsHash === resultsHash && Date.now() < cachedResult.expiresAt) {
    return cachedResult;
  }

  // Try stored data first (from cron or match-result)
  const storedProbs = await db.getTournamentProbs();
  const kvEntry = await db.getKeyValue('consensusBracket');
  const storedBracket = kvEntry?.value || null;
  const hashEntry = await db.getKeyValue('consensusBracketHash');
  const storedHash = hashEntry?.value || '';

  if (storedProbs.length > 0 && storedBracket && storedHash === resultsHash) {
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
    cachedResultsHash = resultsHash;
    return result;
  }

  // No stored data or hash mismatch — compute fresh
  console.log('[tournament-results] Tournament simulation data out of sync or missing in DB, computing fresh...');
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
  await saveBracketAndPredictions(db, bracket);
  await db.setKeyValue('consensusBracketHash', resultsHash);

  const result: CachedResult = {
    championProbs: probs,
    top8: multiResult.top8.slice(0, 8).map((e: any) => ({
      team: e.team, flag: '', wins: e.wins, pct: e.pct,
    })),
    bracket,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  cachedResult = result;
  cachedResultsHash = resultsHash;
  return result;
}

/**
 * Persist the consensus bracket and generate/save prediction entries for all knockout matches
 * in the database, so they are fully populated and queryable by their match ID.
 */
export async function saveBracketAndPredictions(db: any, bracket: any) {
  if (!bracket) return;
  
  await db.setKeyValue('consensusBracket', bracket);

  const allBracketMatches = [
    ...(bracket.roundOf32 || []),
    ...(bracket.roundOf16 || []),
    ...(bracket.quarters || []),
    ...(bracket.semis || []),
    bracket.thirdPlace,
    bracket.final,
  ].filter(Boolean);

  for (const bm of allBracketMatches) {
    const id = bm.id === 'TP-1' ? '3rd' : bm.id === 'FINAL' ? 'Final' : bm.id;
    if (bm.homeTeam === 'TBD' || bm.awayTeam === 'TBD') continue;
    
    // Save or update prediction in database
    await db.savePrediction({
      matchId: id,
      homeWin: Math.round(bm.homeWinProb),
      draw: Math.round(bm.drawProb),
      awayWin: Math.round(bm.awayWinProb),
      mostLikelyScore: `${bm.homeScore}-${bm.awayScore}`,
      expectedGoalsHome: bm.xGHome ?? 0,
      expectedGoalsAway: bm.xGAway ?? 0,
      over25Probability: 0,
      bttsProbability: 0,
      keyFactors: [
        `Enfrentamiento simulado en el bracket de consenso`,
        `Probabilidad de avanzar: ${bm.winner === bm.homeTeam ? bm.homeTeam : bm.awayTeam} favorita (${Math.round(Math.max(bm.homeWinProb, bm.awayWinProb))}%)`
      ],
      confidence: bm.homeWinProb > 55 ? 'alta' : bm.homeWinProb > 40 ? 'media' : 'baja',
      dataQualityScore: 70,
      modelVersion: '3.0-simulation',
      homeAttack: 50,
      homeDefense: 50,
      homeMidfield: 50,
      awayAttack: 50,
      awayDefense: 50,
      awayMidfield: 50,
      homeElo: 1500,
      awayElo: 1500,
      topScores: [
        { home: bm.homeScore, away: bm.awayScore, probability: Math.round(Math.max(bm.homeWinProb, bm.awayWinProb)) }
      ],
      analysis: `Este partido corresponde a la fase eliminatoria (${bm.roundLabel}) del Mundial 2026. Según nuestras 100 simulaciones Monte Carlo del torneo completo, el enfrentamiento proyectado es ${bm.homeTeam} vs ${bm.awayTeam}, con un marcador estimado de ${bm.homeScore}-${bm.awayScore} favoreciendo a ${bm.winner === bm.homeTeam ? bm.homeTeam : bm.awayTeam}.`
    }).catch(() => {});
  }
}
