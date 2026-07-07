// FORCH.i ORACLE — Shared Tournament Computation
// SINGLE SOURCE OF TRUTH for bracket + championProbs.

import { getDataLayerAsync } from './data-layer';
import { simulateTournamentMulti, buildConsensusBracket } from './tournament-sim';
import { resolveKnockoutTeamNames } from './bracket-resolver';
import { predictSingleMatch } from './match-predictor';
import { HARDCODED_RESULTS } from './hardcoded-results';
import { ALL_MATCHES } from './matches';

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
  if (existing.length >= HARDCODED_RESULTS.length) return;

  for (const hr of HARDCODED_RESULTS) {
    const match = ALL_MATCHES.find(m => m.id === hr.matchId);
    if (!match) continue;
    const winner = hr.homeScore > hr.awayScore ? match.homeTeam : hr.awayScore > hr.homeScore ? match.awayTeam : 'draw';
    await db.submitMatchResult({
      matchId: hr.matchId,
      homeScore: hr.homeScore,
      awayScore: hr.awayScore,
      winner
    });
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

      fullFixture.push({
        id: match.id,
        group: match.group,
        date: match.date,
        time: match.time,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        round: 'group',
        predictedScore: [pred.predictedScore[0], pred.predictedScore[1]],
        actualScore: real ? [real.homeScore, real.awayScore] : null,
        confidence: pred.confidence,
        homeWinPct: pred.homeWinPct,
        drawPct: pred.drawPct,
        awayWinPct: pred.awayWinPct,
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
  const allBracketMatches = [
    ...(consensusBracket.roundOf32 || []),
    ...(consensusBracket.roundOf16 || []),
    ...(consensusBracket.quarters || []),
    ...(consensusBracket.semis || []),
    consensusBracket.thirdPlace,
    consensusBracket.final,
  ].filter(Boolean);

  const knockoutMatchesStatic = ALL_MATCHES.filter(m => m.round !== 'group');
  const bracketMatchMap = new Map(allBracketMatches.map(bm => [bm.id === 'TP-1' ? '3rd' : bm.id === 'FINAL' ? 'Final' : bm.id, bm]));

  for (const match of knockoutMatchesStatic) {
    const bm = bracketMatchMap.get(match.id);
    const real = resultsMap.get(match.id);

    let homeTeam = bm?.homeTeam || match.homeTeam;
    let awayTeam = bm?.awayTeam || match.awayTeam;
    let pred = (homeTeam !== 'TBD' && awayTeam !== 'TBD') ? predictSingleMatch(homeTeam, awayTeam, match.id) : null;

    if (bm) {
      if (real) {
        bm.homeScore = real.homeScore;
        bm.awayScore = real.awayScore;
        bm.isPlayed = true;
        bm.winner = real.winner;
      } else if (pred) {
        bm.homeScore = pred.predictedScore[0];
        bm.awayScore = pred.predictedScore[1];
        bm.homeWinProb = pred.homeWinPct;
        bm.drawProb = pred.drawPct;
        bm.awayWinProb = pred.awayWinPct;
        bm.winner = pred.winner;
        bm.isPlayed = false;
        bm.agreement = pred.agreement;
        bm.uncertainty = pred.uncertainty;
        bm.confidenceScore = pred.confidenceScore;
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
      predictedScore: bm && bm.homeTeam !== 'TBD' ? [bm.homeScore, bm.awayScore] : null,
      actualScore: real ? [real.homeScore, real.awayScore] : null,
      confidence: pred?.confidence || null,
      homeWinPct: bm?.homeWinProb || null,
      drawPct: bm?.drawProb || null,
      awayWinPct: bm?.awayWinProb || null,
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
