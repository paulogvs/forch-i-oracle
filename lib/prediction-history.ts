// FORCH.i ORACLE — Prediction History & Drift Tracking
// Saves snapshots of predictions before/after each result.
// Tracks how much predictions change over time ("drift").

import { getDataLayer } from './data-layer';
import { calculateStatisticalPrediction } from './predictor-engine';
import { simulateTournament, simulateTournamentMulti, type RealMatchResult } from './tournament-sim';
import { WORLD_CUP_TEAMS } from './teams';

export interface PredictionSnapshot {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  confidence: string;
  createdAt: string;
  trigger: string; // 'initial' | 'after-<matchId>'
}

export interface PredictionDrift {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  // Original prediction
  original: { homeGoals: number; awayGoals: number; homeWinPct: number };
  // Current prediction
  current: { homeGoals: number; awayGoals: number; homeWinPct: number };
  // Drift
  goalDrift: number;           // |current - original| in goals
  confidenceDrift: number;     // percentage points change
  direction: 'up' | 'down' | 'same'; // did confidence increase?
  updatedAt: string;
}

/**
 * Generate initial predictions for all group stage matches.
 * Called once before the tournament starts.
 */
export async function generateInitialPredictions(): Promise<PredictionSnapshot[]> {
  const db = getDataLayer();
  const allMatches = await db.getAllMatches();
  const groupMatches = allMatches.filter(m => m.round === 'group');
  const snapshots: PredictionSnapshot[] = [];

  for (const match of groupMatches) {
    try {
      const pred = await calculateStatisticalPrediction(match.homeTeamId, match.awayTeamId);
      const snapshot: PredictionSnapshot = {
        matchId: match.id,
        homeTeam: match.homeTeamId,
        awayTeam: match.awayTeamId,
        homeGoals: pred.predictedScoreHome,
        awayGoals: pred.predictedScoreAway,
        homeWinPct: pred.homeWin,
        drawPct: pred.draw,
        awayWinPct: pred.awayWin,
        confidence: pred.confidence,
        createdAt: new Date().toISOString(),
        trigger: 'initial',
      };
      snapshots.push(snapshot);

      // Save to data layer
      await db.savePrediction({
        matchId: match.id,
        homeWin: pred.homeWin,
        draw: pred.draw,
        awayWin: pred.awayWin,
        mostLikelyScore: `${pred.predictedScoreHome}-${pred.predictedScoreAway}`,
        expectedGoalsHome: pred.homeExpectedGoals,
        expectedGoalsAway: pred.awayExpectedGoals,
        over25Probability: pred.over25Probability,
        bttsProbability: pred.bttsProbability,
        keyFactors: [],
        confidence: pred.confidence,
        dataQualityScore: 50,
        modelVersion: '2.0',
        homeAttack: pred.homeAttack,
        homeDefense: pred.homeDefense,
        homeMidfield: pred.homeMidfield,
        awayAttack: pred.awayAttack,
        awayDefense: pred.awayDefense,
        awayMidfield: pred.awayMidfield,
        homeElo: pred.homeElo,
        awayElo: pred.awayElo,
        topScores: pred.topScores,
      });
    } catch {
      // Skip failed predictions
    }
  }

  return snapshots;
}

/**
 * After a real result comes in:
 * 1. Save the original predictions as a snapshot
 * 2. Re-simulate the entire tournament with the new result
 * 3. Calculate drift for each future match
 * 4. Return drift data for display
 */
export async function recalculateAfterResult(
  playedMatchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ drifts: PredictionDrift[]; bracket: any; top8: any[] }> {
  const db = getDataLayer();

  // Step 1: Save snapshot of current predictions for this match (before update)
  const currentPred = await db.getPrediction(playedMatchId);

  // Step 2: Record the real result
  const match = await db.getMatch(playedMatchId);
  if (!match) throw new Error(`Match not found: ${playedMatchId}`);

  const winner = homeScore > awayScore ? match.homeTeamId : awayScore > homeScore ? match.awayTeamId : 'draw';

  await db.submitMatchResult({
    matchId: playedMatchId,
    homeScore,
    awayScore,
    winner,
  });

  // Step 3: Re-simulate the entire tournament with real results
  const realResults = await db.getMatchResults();
  const simResults: RealMatchResult[] = realResults.map(r => ({
    matchId: r.matchId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    winner: r.winner,
  }));

  // Run tournament simulation with real results baked in
  const simResult = await simulateTournamentMulti(100, simResults, () => {});

  // Step 4: Calculate drift for future matches
  const drifts: PredictionDrift[] = [];
  const upcomingMatches = await db.getUpcomingMatches();

  // Map bracket results to matches (use the last simulation's bracket)
  const bracketMatches = [
    ...simResult.bracket.roundOf32,
    ...simResult.bracket.roundOf16,
    ...simResult.bracket.quarters,
    ...simResult.bracket.semis,
    simResult.bracket.thirdPlace,
    simResult.bracket.final,
  ].filter(Boolean);

  for (const bm of bracketMatches) {
    const futureMatch = upcomingMatches.find(m => m.id === bm.id);
    if (!futureMatch) continue;

    // Find original prediction
    const origPred = await db.getPrediction(futureMatch.id);
    if (!origPred) continue;

    const origHome = parseInt(origPred.mostLikelyScore?.split('-')[0] || '0');
    const origAway = parseInt(origPred.mostLikelyScore?.split('-')[1] || '0');
    const origHomeWin = origPred.homeWin;

    const newHome = bm.homeScore;
    const newAway = bm.awayScore;
    const newHomeWin = bm.homeWinProb;

    const goalDrift = Math.abs(newHome - origHome) + Math.abs(newAway - origAway);
    const confidenceDrift = newHomeWin - origHomeWin;

    drifts.push({
      matchId: futureMatch.id,
      homeTeam: futureMatch.homeTeamId,
      awayTeam: futureMatch.awayTeamId,
      original: { homeGoals: origHome, awayGoals: origAway, homeWinPct: origHomeWin },
      current: { homeGoals: newHome, awayGoals: newAway, homeWinPct: newHomeWin },
      goalDrift,
      confidenceDrift: Math.round(confidenceDrift * 10) / 10,
      direction: confidenceDrift > 0 ? 'up' : confidenceDrift < 0 ? 'down' : 'same',
      updatedAt: new Date().toISOString(),
    });

    // Update prediction in data layer
    await db.savePrediction({
      matchId: futureMatch.id,
      homeWin: Math.round(bm.homeWinProb),
      draw: Math.round(bm.drawProb),
      awayWin: Math.round(bm.awayWinProb),
      mostLikelyScore: `${bm.homeScore}-${bm.awayScore}`,
      expectedGoalsHome: bm.xGHome ?? 0,
      expectedGoalsAway: bm.xGAway ?? 0,
      over25Probability: 0,
      bttsProbability: 0,
      keyFactors: [],
      confidence: bm.homeWinProb > 55 ? 'alta' : bm.homeWinProb > 40 ? 'media' : 'baja',
      dataQualityScore: 70,
      modelVersion: '2.0',
      homeAttack: 50,
      homeDefense: 50,
      homeMidfield: 50,
      awayAttack: 50,
      awayDefense: 50,
      awayMidfield: 50,
      homeElo: 1500,
      awayElo: 1500,
      topScores: [],
    });
  }

  // Step 5: Build top 8 from simulation
  const top8 = simResult.top8 || [];

  return { drifts, bracket: simResult.bracket, top8: simResult.top8 };
}

/**
 * Get live standings recalculated from real results only.
 */
export async function getLiveStandings(): Promise<Record<string, Array<{
  name: string; flag: string; played: number; won: number; drawn: number;
  lost: number; gf: number; ga: number; gd: number; points: number;
}>>> {
  const db = getDataLayer();
  const realResults = await db.getMatchResults();

  const standings: Record<string, any> = {};

  // Initialize standings for all groups
  for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const teams = WORLD_CUP_TEAMS.filter((t) => t.group === letter);
    standings[letter] = teams.map((t: any) => ({
      name: t.name,
      flag: t.flag,
      played: 0, won: 0, drawn: 0, lost: 0,
      gf: 0, ga: 0, gd: 0, points: 0,
    }));
  }

  // Process real results
  for (const result of realResults) {
    const match = await db.getMatch(result.matchId);
    if (!match || match.round !== 'group') continue;

    const group = match.groupChar || 'A';
    if (!standings[group]) continue;

    const homeTeam = standings[group].find((t: any) => t.name === match.homeTeamId);
    const awayTeam = standings[group].find((t: any) => t.name === match.awayTeamId);
    if (!homeTeam || !awayTeam) continue;

    homeTeam.played++;
    awayTeam.played++;
    homeTeam.gf += result.homeScore;
    homeTeam.ga += result.awayScore;
    awayTeam.gf += result.awayScore;
    awayTeam.ga += result.homeScore;
    homeTeam.gd = homeTeam.gf - homeTeam.ga;
    awayTeam.gd = awayTeam.gf - awayTeam.ga;

    if (result.homeScore > result.awayScore) {
      homeTeam.won++; homeTeam.points += 3;
      awayTeam.lost++;
    } else if (result.homeScore < result.awayScore) {
      awayTeam.won++; awayTeam.points += 3;
      homeTeam.lost++;
    } else {
      homeTeam.drawn++; awayTeam.drawn++;
      homeTeam.points += 1; awayTeam.points += 1;
    }
  }

  // Sort each group
  for (const group of Object.keys(standings)) {
    standings[group].sort((a: any, b: any) =>
      b.points - a.points || b.gd - a.gd || b.gf - a.gf
    );
  }

  return standings;
}

/**
 * Get live knockout bracket from real results.
 */
export async function getLiveBracket(): Promise<any> {
  const db = getDataLayer();
  const realResults = await db.getMatchResults();

  const simResults: RealMatchResult[] = realResults.map(r => ({
    matchId: r.matchId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    winner: r.winner,
  }));

  if (simResults.length === 0) return null;

  const multiResult = await simulateTournamentMulti(10, simResults, () => {});
  return multiResult.bracket;
}
