// FORCH.i ORACLE — Shared Tournament Computation
// SINGLE SOURCE OF TRUTH for bracket + championProbs.

import { getDataLayerAsync } from './data-layer';
import { simulateTournamentMulti, buildConsensusBracket } from './tournament-sim';
import { resolveKnockoutTeamNames } from './bracket-resolver';
import { predictSingleMatch } from './match-predictor';
import { HARDCODED_RESULTS } from './hardcoded-results';
import { ALL_MATCHES } from './matches';
import { ELO_RATINGS, POWER_RATINGS } from './teams';

// ═══ IN-MEMORY CACHE ═══
interface CachedResult {
  championProbs: any[];
  top8: any[];
  bracket: any;
  fixture: any[];
  groupStandings: Record<string, any[]>;
  expiresAt: number;
}
let cachedResult: CachedResult | null = null;
let cachedResultsHash: string | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function ensureHardcodedResults(db: any) {
  const existing = await db.getMatchResults();

  // First ingest all hardcoded results (re-ingest even if already there, to update penalty winners)
  // The data layer replaces existing entries by matchId.
  for (const hr of HARDCODED_RESULTS) {
    const match = ALL_MATCHES.find(m => m.id === hr.matchId);
    if (!match) continue;
    // Use penalty scores for KO draws, else use score
    let initialWinner: string;
    if (hr.homePenScore != null && hr.awayPenScore != null) {
      initialWinner = hr.homePenScore > hr.awayPenScore ? match.homeTeam : match.awayTeam;
    } else if (hr.homeScore > hr.awayScore) {
      initialWinner = match.homeTeam;
    } else if (hr.awayScore > hr.homeScore) {
      initialWinner = match.awayTeam;
    } else {
      initialWinner = 'draw';
    }
    await db.submitMatchResult({
      matchId: hr.matchId,
      homeScore: hr.homeScore,
      awayScore: hr.awayScore,
      winner: initialWinner,
      homePenScore: hr.homePenScore,
      awayPenScore: hr.awayPenScore,
    });
  }

  // Resolve bracket slots to real team names
  await resolveKnockoutTeamNames(db);

  // Now re-read resolved matches and update winner names in results
  const resolvedMatches = await db.getAllMatches();
  for (const hr of HARDCODED_RESULTS) {
    const resolvedMatch = resolvedMatches.find((m: any) => m.id === hr.matchId);
    if (!resolvedMatch) continue;
    const homeName = resolvedMatch.homeTeamId;
    const awayName = resolvedMatch.awayTeamId;
    // Slot detection: 1A-1L, 2A-2L, 3A-3L, W-*, L-*
    const isSlot = (s: string) => /^[12][A-L]$|^3[A-L]/.test(s) || /^W-/.test(s) || /^L-/.test(s);
    if (homeName && awayName && !isSlot(homeName) && !isSlot(awayName)) {
      // Use penalty scores to determine real winner name
      // Use penalty scores to determine real winner name
      let realWinner: string;
      if (hr.homePenScore != null && hr.awayPenScore != null) {
        realWinner = hr.homePenScore > hr.awayPenScore ? homeName : awayName;
      } else if (hr.homeScore > hr.awayScore) {
        realWinner = homeName;
      } else if (hr.awayScore > hr.homeScore) {
        realWinner = awayName;
      } else {
        realWinner = 'draw';
      }
      // Update the result with the real team name as winner
      await db.submitMatchResult({
        matchId: hr.matchId,
        homeScore: hr.homeScore,
        awayScore: hr.awayScore,
        winner: realWinner,
        homePenScore: hr.homePenScore,
        awayPenScore: hr.awayPenScore,
      });
    }
  }
}

export async function getOrComputeTournamentResults() {
  const db = await getDataLayerAsync();
  await ensureHardcodedResults(db);

  const realResults = await db.getMatchResults();
  const resultsHash = realResults
    .map((r: any) => `${r.matchId}:${r.homeScore}-${r.awayScore}`)
    .sort()
    .join('|');

  // Return cached if fresh and results hash matches
  if (cachedResult && cachedResultsHash === resultsHash && Date.now() < cachedResult.expiresAt) {
    return cachedResult;
  }

  // 1. Resolve Bracket
  await resolveKnockoutTeamNames(db).catch(console.error);

  // 2. Simulation
  const simResults = realResults.map((r: any) => ({
    matchId: r.matchId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    winner: r.winner,
  }));
  const multiResult = await simulateTournamentMulti(1000, simResults, () => {});
  const consensusBracket = buildConsensusBracket(multiResult.roundCounts, 1000, multiResult.top8);

  // 3. Build Full Fixture (Group + Knockout)
  const resultsMap = new Map(realResults.map(r => [r.matchId, r]));
  const fullFixture: any[] = [];
  const groupStandings: Record<string, any[]> = {};

  // Group Stage Standings & Fixture
  for (const group of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const groupMatches = ALL_MATCHES.filter(m => m.group === group);
    const standings: Record<string, { pts: number; gf: number; ga: number; gd: number; played: number }> = {};

    for (const match of groupMatches) {
      standings[match.homeTeam] = standings[match.homeTeam] || { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
      standings[match.awayTeam] = standings[match.awayTeam] || { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };

      const real = resultsMap.get(match.id);
      const pred = predictSingleMatch(match.homeTeam, match.awayTeam, match.id);

      const homeScore = real ? real.homeScore : pred.predictedScore[0];
      const awayScore = real ? real.awayScore : pred.predictedScore[1];

      // Try to get prediction from DB first to maintain consistency
      const dbPred = await db.getPrediction(match.id);

      fullFixture.push({
        id: match.id,
        group: match.group,
        date: match.date,
        time: match.time,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        round: 'group',
        predictedScore: dbPred ? dbPred.mostLikelyScore.split('-').map(Number) : [pred.predictedScore[0], pred.predictedScore[1]],
        actualScore: real ? [real.homeScore, real.awayScore] : null,
        confidence: dbPred ? dbPred.confidence : pred.confidence,
        homeWinPct: dbPred ? dbPred.homeWin : pred.homeWinPct,
        drawPct: dbPred ? dbPred.draw : pred.drawPct,
        awayWinPct: dbPred ? dbPred.awayWin : pred.awayWinPct,
      });

      // Update virtual standings for this group
      const h = standings[match.homeTeam];
      const a = standings[match.awayTeam];
      h.played++; a.played++;
      h.gf += homeScore; h.ga += awayScore;
      a.gf += awayScore; a.ga += homeScore;
      h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
      if (homeScore > awayScore) h.pts += 3;
      else if (homeScore < awayScore) a.pts += 3;
      else { h.pts += 1; a.pts += 1; }
    }

    groupStandings[group] = Object.entries(standings)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  }

  // Knockout Stage Fixture Enrichment
  // Use DATA LAYER matches (already resolved by resolveKnockoutTeamNames) as SINGLE SOURCE OF TRUTH
  // The consensus bracket is simulation-derived and may have wrong matchups — ignore it for team names.
  const dbMatches = await db.getAllMatches();
  const dbMatchMap = new Map(dbMatches.map(m => [m.id, m]));

  const knockoutMatchesStatic = ALL_MATCHES.filter(m => m.round !== 'group');

  for (const match of knockoutMatchesStatic) {
    const real = resultsMap.get(match.id);

    // SINGLE SOURCE OF TRUTH: data layer resolved names (set by resolveKnockoutTeamNames)
    const dbMatch = dbMatchMap.get(match.id);
    const resolvedHome = dbMatch?.homeTeamId && !/^[12WLA]/.test(dbMatch.homeTeamId) && dbMatch.homeTeamId !== 'TBD'
      ? dbMatch.homeTeamId : match.homeTeam;
    const resolvedAway = dbMatch?.awayTeamId && !/^[12WLA]/.test(dbMatch.awayTeamId) && dbMatch.awayTeamId !== 'TBD'
      ? dbMatch.awayTeamId : match.awayTeam;

    let homeTeam = resolvedHome;
    let awayTeam = resolvedAway;
    let pred = (homeTeam !== 'TBD' && awayTeam !== 'TBD') ? predictSingleMatch(homeTeam, awayTeam, match.id) : null;

    // Try to get prediction from DB first to maintain consistency
    const dbPred = await db.getPrediction(match.id);

    // Determine predicted score: DB > engine prediction > null
    let predictedScore: [number, number] | null = null;
    if (dbPred) {
      predictedScore = dbPred.mostLikelyScore.split('-').map(Number) as [number, number];
    } else if (pred && homeTeam !== 'TBD' && awayTeam !== 'TBD') {
      predictedScore = [pred.predictedScore[0], pred.predictedScore[1]];
    }

    // Generate key factors for the prediction reasoning
    const keyFactors: string[] = [];
    if (pred && homeTeam !== 'TBD' && awayTeam !== 'TBD') {
      const homeElo = ELO_RATINGS[homeTeam]?.elo || 1500;
      const awayElo = ELO_RATINGS[awayTeam]?.elo || 1500;
      const eloDiff = homeElo - awayElo;
      const homeAttack = POWER_RATINGS[homeTeam]?.attack || 50;
      const awayAttack = POWER_RATINGS[awayTeam]?.attack || 50;
      const homeDefense = POWER_RATINGS[homeTeam]?.defense || 50;
      const awayDefense = POWER_RATINGS[awayTeam]?.defense || 50;

      // Elo factor
      if (Math.abs(eloDiff) > 100) {
        const fav = eloDiff > 0 ? homeTeam : awayTeam;
        keyFactors.push(`Ventaja Elo: ${fav} (+${Math.abs(eloDiff)} pts)`);
      } else {
        keyFactors.push('Equipos parejos en Elo — resultado abierto');
      }

      // Attack factor
      if (homeAttack > awayAttack + 10) {
        keyFactors.push(`Ataque local superior (${homeAttack} vs ${awayAttack})`);
      } else if (awayAttack > homeAttack + 10) {
        keyFactors.push(`Ataque visitante superior (${awayAttack} vs ${homeAttack})`);
      }

      // Defense factor
      if (homeDefense > awayDefense + 10) {
        keyFactors.push(`Defensa local sólida (${homeDefense})`);
      } else if (awayDefense > homeDefense + 10) {
        keyFactors.push(`Defensa visitante sólida (${awayDefense})`);
      }

      // Model agreement
      if (pred.agreement !== undefined && pred.agreement > 0.8) {
        keyFactors.push('Alta concordancia entre modelos');
      } else if (pred.agreement !== undefined && pred.agreement < 0.5) {
        keyFactors.push('Modelos discrepantes — incertidumbre alta');
      }

      // Confidence
      const maxProb = Math.max(pred.homeWinPct, pred.awayWinPct);
      if (maxProb > 70) {
        keyFactors.push(`Predicción de alta confianza (${maxProb.toFixed(0)}%)`);
      } else if (maxProb < 50) {
        keyFactors.push('Partido muy disputado');
      }
    }

    fullFixture.push({
      id: match.id,
      group: match.group,
      date: match.date,
      time: match.time,
      homeTeam,
      awayTeam,
      round: match.round,
      predictedScore,
      actualScore: real ? [real.homeScore, real.awayScore] : null,
      confidence: dbPred ? dbPred.confidence : (pred?.confidence || null),
      homeWinPct: dbPred ? dbPred.homeWin : (pred?.homeWinPct || null),
      drawPct: dbPred ? dbPred.draw : (pred?.drawPct || null),
      awayWinPct: dbPred ? dbPred.awayWin : (pred?.awayWinPct || null),
      keyFactors,
    });
  }

  // 4. Store Probs & Cache
  const probs = multiResult.top8.map((c: any) => ({
    teamId: c.team,
    championProb: c.pct,
    simulationsCount: c.wins,
    totalSimulations: 1000,
  }));

  const result: CachedResult = {
    championProbs: probs,
    top8: multiResult.top8.slice(0, 8).map((e: any) => ({
      team: e.team, flag: e.flag, wins: e.wins, pct: e.pct,
    })),
    bracket: consensusBracket,
    fixture: fullFixture,
    groupStandings,
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
      analysis: `Este partido corresponde a la fase eliminatoria (${bm.roundLabel}) del Mundial 2026. Según nuestras 1,000 simulaciones Monte Carlo del torneo completo, el enfrentamiento proyectado es ${bm.homeTeam} vs ${bm.awayTeam}, con un marcador estimado de ${bm.homeScore}-${bm.awayScore} favoreciendo a ${bm.winner === bm.homeTeam ? bm.homeTeam : bm.awayTeam}.`
    }).catch(() => {});
  }
}
