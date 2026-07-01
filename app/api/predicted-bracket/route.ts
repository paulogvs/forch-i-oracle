// FORCH.i ORACLE — API Route: Predicted Bracket with Real Results
// GET /api/predicted-bracket
// Returns the consensus bracket enriched with ensemble predictions + actual results.
// Phase 1 of "Bracket Vivo" — combined predicted-vs-actual view.

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { getOrComputeTournamentResults } from '@/lib/tournament-results';
import { calculateEnsemblePrediction } from '@/lib/ensemble-engine';

// ─── Response Types ──────────────────────────────────────────────────────────

export interface PredictedBracketMatch {
  id: string;
  round: string;
  roundLabel: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  predictedWinner: string;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  actualWinner: string | null;
  isPlayed: boolean;
  status: 'predicted' | 'correct' | 'exact' | 'wrong';
  homeWinProb: number;
  awayWinProb: number;
  extraTime: boolean;
  penalties: boolean;
}

export interface ChampionPathStep {
  round: string;
  label: string;
  opponent: string;
  opponentFlag: string;
  championPredictedScore: number;
  opponentPredictedScore: number;
  actualChampionScore: number | null;
  actualOpponentScore: number | null;
  isPlayed: boolean;
}

export interface PredictedBracketResponse {
  success: boolean;
  champion: string | null;
  championFlag: string;
  championProb: number | null;
  runnerUp: string | null;
  thirdPlace: string | null;
  bracket: {
    roundOf32: PredictedBracketMatch[];
    roundOf16: PredictedBracketMatch[];
    quarters: PredictedBracketMatch[];
    semis: PredictedBracketMatch[];
    thirdPlace: PredictedBracketMatch | null;
    final: PredictedBracketMatch | null;
  } | null;
  championPath: ChampionPathStep[];
  stats: {
    total: number;
    played: number;
    correct: number;
    exact: number;
    wrong: number;
    accuracy: number | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPrediction(homeTeam: string, awayTeam: string, fallbackHome: number, fallbackAway: number) {
  if (homeTeam === 'TBD' || awayTeam === 'TBD') {
    return { homeScore: 0, awayScore: 0, homeWin: 50, awayWin: 50, winner: 'TBD' };
  }
  try {
    const e = calculateEnsemblePrediction(homeTeam, awayTeam);
    const homeScore = Math.round(e.predictedScoreHome);
    const awayScore = Math.round(e.predictedScoreAway);
    return {
      homeScore,
      awayScore,
      homeWin: e.homeWin,
      awayWin: e.awayWin,
      winner: homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : homeTeam,
    };
  } catch {
    // Fallback to bracket values
    return {
      homeScore: fallbackHome,
      awayScore: fallbackAway,
      homeWin: 50,
      awayWin: 50,
      winner: fallbackHome > fallbackAway ? homeTeam : fallbackAway > fallbackHome ? awayTeam : homeTeam,
    };
  }
}

function determineStatus(
  predictedWinner: string,
  actualWinner: string | null,
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null,
): 'predicted' | 'correct' | 'exact' | 'wrong' {
  if (!actualWinner) return 'predicted';
  if (predictedWinner === actualWinner) {
    if (predictedHome === actualHome && predictedAway === actualAway) return 'exact';
    return 'correct';
  }
  return 'wrong';
}

function enrichMatch(bm: any, actualResultsMap: Map<string, any>, getFlag: (name: string) => string): PredictedBracketMatch | null {
  if (!bm || bm.homeTeam === 'TBD' || bm.awayTeam === 'TBD') return null;

  const pred = getPrediction(bm.homeTeam, bm.awayTeam, bm.homeScore, bm.awayScore);
  const actual = actualResultsMap.get(bm.id);

  if (bm.id === 'TP-1') {
    bm.roundLabel = 'Tercer Puesto';
  }

  const status = determineStatus(
    pred.winner,
    actual?.winner ?? null,
    pred.homeScore,
    pred.awayScore,
    actual?.homeScore ?? null,
    actual?.awayScore ?? null,
  );

  return {
    id: bm.id,
    round: bm.round || (bm.id === 'FINAL' ? 'F' : bm.id === 'TP-1' ? 'TP' : bm.round),
    roundLabel: bm.roundLabel || '',
    homeTeam: bm.homeTeam,
    awayTeam: bm.awayTeam,
    homeFlag: bm.homeFlag || '',
    awayFlag: bm.awayFlag || '',
    predictedHomeScore: pred.homeScore,
    predictedAwayScore: pred.awayScore,
    predictedWinner: pred.winner,
    actualHomeScore: actual?.homeScore ?? null,
    actualAwayScore: actual?.awayScore ?? null,
    actualWinner: actual?.winner ?? null,
    isPlayed: actual != null,
    status,
    homeWinProb: pred.homeWin,
    awayWinProb: pred.awayWin,
    extraTime: bm.extraTime || false,
    penalties: bm.penalties || false,
  };
}

function extractChampionPath(
  bracket: any,
  champion: string,
  actualResultsMap: Map<string, any>,
): ChampionPathStep[] {
  if (!champion) return [];

  const rounds = [
    { key: 'roundOf32', label: '1/16 Final', round: 'R32' },
    { key: 'roundOf16', label: 'Octavos', round: 'R16' },
    { key: 'quarters', label: 'Cuartos', round: 'QF' },
    { key: 'semis', label: 'Semis', round: 'SF' },
    { key: 'final', label: 'Final', round: 'F' },
  ];

  const path: ChampionPathStep[] = [];

  for (const r of rounds) {
    let match: any;
    if (r.key === 'final') {
      match = bracket.final;
    } else {
      match = (bracket[r.key] || []).find(
        (m: any) => m && (m.winner === champion || m.homeTeam === champion),
      );
    }
    if (!match || match.homeTeam === 'TBD' || match.awayTeam === 'TBD') continue;

    const isChampHome = match.homeTeam === champion;
    const opponent = isChampHome ? match.awayTeam : match.homeTeam;

    // Get predicted score
    let predHome = match.homeScore;
    let predAway = match.awayScore;
    try {
      if (match.homeTeam !== 'TBD' && match.awayTeam !== 'TBD') {
        const ensemble = calculateEnsemblePrediction(match.homeTeam, match.awayTeam);
        predHome = Math.round(ensemble.predictedScoreHome);
        predAway = Math.round(ensemble.predictedScoreAway);
      }
    } catch {
      // fallback
    }

    const actual = actualResultsMap.get(match.id);

    path.push({
      round: r.round,
      label: r.label,
      opponent,
      opponentFlag: match.awayFlag || '',
      championPredictedScore: isChampHome ? predHome : predAway,
      opponentPredictedScore: isChampHome ? predAway : predHome,
      actualChampionScore: actual ? (isChampHome ? actual.homeScore : actual.awayScore) : null,
      actualOpponentScore: actual ? (isChampHome ? actual.awayScore : actual.homeScore) : null,
      isPlayed: actual != null,
    });
  }

  return path;
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const db = await getDataLayerAsync();
    const allResults = await db.getMatchResults();
    const actualResultsMap = new Map<string, any>();
    for (const r of allResults) {
      if (r.homeScore != null && r.awayScore != null) {
        actualResultsMap.set(r.matchId, r);
      }
    }

    const tournamentData = await getOrComputeTournamentResults();
    const bracket = tournamentData.bracket;
    const championProbs = tournamentData.championProbs || [];

    if (!bracket) {
      return NextResponse.json({
        success: true,
        champion: null,
        championFlag: '',
        championProb: null,
        runnerUp: null,
        thirdPlace: null,
        bracket: null,
        championPath: [],
        stats: { total: 0, played: 0, correct: 0, exact: 0, wrong: 0, accuracy: null },
      } satisfies PredictedBracketResponse);
    }

    // Enrich all rounds
    const enrichedR32 = (bracket.roundOf32 || []).map((m: any) => enrichMatch(m, actualResultsMap, () => '')).filter(Boolean) as PredictedBracketMatch[];
    const enrichedR16 = (bracket.roundOf16 || []).map((m: any) => enrichMatch(m, actualResultsMap, () => '')).filter(Boolean) as PredictedBracketMatch[];
    const enrichedQF = (bracket.quarters || []).map((m: any) => enrichMatch(m, actualResultsMap, () => '')).filter(Boolean) as PredictedBracketMatch[];
    const enrichedSF = (bracket.semis || []).map((m: any) => enrichMatch(m, actualResultsMap, () => '')).filter(Boolean) as PredictedBracketMatch[];
    const enrichedTP = bracket.thirdPlace ? enrichMatch(bracket.thirdPlace, actualResultsMap, () => '') : null;
    const enrichedFinal = bracket.final ? enrichMatch(bracket.final, actualResultsMap, () => '') : null;

    // Compute stats
    const allMatches = [...enrichedR32, ...enrichedR16, ...enrichedQF, ...enrichedSF];
    if (enrichedTP) allMatches.push(enrichedTP);
    if (enrichedFinal) allMatches.push(enrichedFinal);

    const played = allMatches.filter(m => m.isPlayed);
    const correct = played.filter(m => m.status === 'correct' || m.status === 'exact');
    const exact = played.filter(m => m.status === 'exact');
    const wrong = played.filter(m => m.status === 'wrong');

    // Champion path
    const champion = bracket.champion || null;
    const championPath = champion
      ? extractChampionPath(bracket, champion, actualResultsMap)
      : [];

    // Get champion probability
    let championProb: number | null = null;
    if (champion && championProbs.length > 0) {
      const cp = championProbs.find((p: any) => p.teamId === champion || p.team === champion);
      championProb = cp?.championProb ?? cp?.pct ?? null;
    }

    const response: PredictedBracketResponse = {
      success: true,
      champion,
      championFlag: bracket.championFlag || '',
      championProb,
      runnerUp: bracket.runnerUp || null,
      thirdPlace: bracket.thirdPlaceTeam || null,
      bracket: {
        roundOf32: enrichedR32,
        roundOf16: enrichedR16,
        quarters: enrichedQF,
        semis: enrichedSF,
        thirdPlace: enrichedTP,
        final: enrichedFinal,
      },
      championPath,
      stats: {
        total: allMatches.length,
        played: played.length,
        correct: correct.length,
        exact: exact.length,
        wrong: wrong.length,
        accuracy: played.length > 0
          ? Math.round((correct.length / played.length) * 10000) / 100
          : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[predicted-bracket] Error:', error);
    return NextResponse.json({
      success: true,
      champion: null,
      championFlag: '',
      championProb: null,
      runnerUp: null,
      thirdPlace: null,
      bracket: null,
      championPath: [],
      stats: { total: 0, played: 0, correct: 0, exact: 0, wrong: 0, accuracy: null },
    } satisfies PredictedBracketResponse);
  }
}
