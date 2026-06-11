/**
 * worldcup-bench-data.ts
 * Typed data access layer for WorldCupBench predictions.
 * Loads 10 model pre-tournament predictions + tournament structure.
 * Provides consensus, leaderboard, and model comparison utilities.
 */

import type { ModelPrediction, PredictionMatch, FinalStandings, KnockoutStage } from './worldcup-bench-types';
export type { ModelPrediction, PredictionMatch, FinalStandings, KnockoutStage };

// --- Static imports (all 10 predictions loaded at build time) ---
import claudeFable5 from '@/data/worldcup-bench/Claude-Fable-5_prediction.json';
import deepseekV4Pro from '@/data/worldcup-bench/DeepSeek-V4-Pro_prediction.json';
import glm51 from '@/data/worldcup-bench/GLM-5.1_prediction.json';
import gpt55 from '@/data/worldcup-bench/GPT-5.5_prediction.json';
import gemini35Flash from '@/data/worldcup-bench/Gemini-3.5-Flash_prediction.json';
import grok43 from '@/data/worldcup-bench/Grok-4.3_prediction.json';
import mimoV25Pro from '@/data/worldcup-bench/MiMo-V2.5-Pro_prediction.json';
import minimaxM3 from '@/data/worldcup-bench/MiniMax-M3_prediction.json';
import nexN2Pro from '@/data/worldcup-bench/Nex-N2-Pro_prediction.json';
import qwen37Max from '@/data/worldcup-bench/Qwen-3.7-Max_prediction.json';

import tournamentData from '@/data/worldcup-bench/tournament.json';
import leaderboardData from '@/data/worldcup-bench/leaderboard.json';

// ======================== TYPES ========================

export interface ConsensusEntry {
  matchId: string;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  venue?: string;
  counts: { home: number; draw: number; away: number };
  total: number;
  agreement: number;           // percentage of models that agree with the majority
  majorityResult: 'home' | 'draw' | 'away';
  modelsHome: string[];
  modelsDraw: string[];
  modelsAway: string[];
  predictions: Record<string, {
    result: 'home' | 'draw' | 'away';
    score: { home: number; away: number };
    probs: { home: number; draw: number; away: number };
  }>;
  // Brier scoring fields (non-null once real results come in)
  brierScore?: number;
  realResult?: 'home' | 'draw' | 'away';
  correctOutcome?: boolean;
}

export interface ModelInfo {
  name: string;
  fullName: string;
  id: string;
  champion: string;
  runnerUp: string;
  thirdPlace: string;
  fourthPlace: string;
  timestamp: string;
  totalTokens: number;
  costUsd: number;
  promptVersion: string;
  temperature: number;
}

export interface LeaderboardEntry {
  rank: number;
  modelName: string;
  correctOutcomes: number;
  exactScores: number;
  totalEvaluated: number;
  accuracy: number;
  brierAvg: number | null;
  bracketPoints: number;
  champion: string;
  runnerUp: string;
}

export interface MatchResult {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  result: 'home' | 'draw' | 'away';
}

// ======================== DATA ========================

export const ALL_MODELS: string[] = [
  'Claude-Fable-5',
  'DeepSeek-V4-Pro',
  'GLM-5.1',
  'GPT-5.5',
  'Gemini-3.5-Flash',
  'Grok-4.3',
  'MiMo-V2.5-Pro',
  'MiniMax-M3',
  'Nex-N2-Pro',
  'Qwen-3.7-Max',
];

// Private registry — maps model name to prediction data
const predictions: Record<string, ModelPrediction> = {
  'Claude-Fable-5': claudeFable5 as ModelPrediction,
  'DeepSeek-V4-Pro': deepseekV4Pro as ModelPrediction,
  'GLM-5.1': glm51 as ModelPrediction,
  'GPT-5.5': gpt55 as ModelPrediction,
  'Gemini-3.5-Flash': gemini35Flash as ModelPrediction,
  'Grok-4.3': grok43 as ModelPrediction,
  'MiMo-V2.5-Pro': mimoV25Pro as ModelPrediction,
  'MiniMax-M3': minimaxM3 as ModelPrediction,
  'Nex-N2-Pro': nexN2Pro as ModelPrediction,
  'Qwen-3.7-Max': qwen37Max as ModelPrediction,
};

// ======================== PUBLIC API ========================

/** Get model info for all 10 models */
export function getAllModelInfos(): ModelInfo[] {
  return ALL_MODELS.map((name) => getModelInfo(name));
}

/** Get model info for a specific model */
export function getModelInfo(name: string): ModelInfo {
  const p = predictions[name];
  if (!p) throw new Error(`Model "${name}" not found`);
  return {
    name,
    fullName: name,
    id: p.model_id,
    champion: p.final_standings.champion,
    runnerUp: p.final_standings.runner_up,
    thirdPlace: p.final_standings.third_place,
    fourthPlace: p.final_standings.fourth_place,
    timestamp: p.timestamp,
    totalTokens: p.usage?.total?.total_tokens ?? 0,
    costUsd: p.cost_usd?.total ?? 0,
    promptVersion: p.prompt_version ?? '2.1',
    temperature: p.temperature ?? 0.3,
  };
}

/** Get full prediction for a model */
export function getPrediction(name: string): ModelPrediction {
  const p = predictions[name];
  if (!p) throw new Error(`Model "${name}" not found`);
  return p;
}

/** Get all predictions */
export function getAllPredictions(): Record<string, ModelPrediction> {
  return predictions;
}

/** Get tournament data */
export function getTournamentData() {
  return tournamentData as any;
}

/** Get leaderboard data from benchmark */
export function getLeaderboardData() {
  return leaderboardData as any;
}

/**
 * Get the bracket (group + knockout matches) as defined by the tournament
 */
export function getTournamentBracket() {
  const td = tournamentData as any;
  return {
    groups: td.groups as Array<{ group: string; teams: string[] }>,
    matches: td.matches as Array<{
      match_id: number;
      group: string;
      home_team: string;
      away_team: string;
      date: string;
      venue: { stadium: string; city: string };
    }>,
    knockout: td.knockout_bracket as Array<{
      match_id: number;
      round: string;
      home_team: string;
      away_team: string;
      date: string;
      venue: { stadium: string; city: string };
      feeds_into?: number;
    }>,
    metadata: td.metadata,
  };
}

/**
 * Build a cross-model consensus for the entire tournament.
 * For each match, shows how many models predict home/draw/away.
 */
export function buildConsensus(): ConsensusEntry[] {
  const tournament = tournamentData as any;
  const entries: ConsensusEntry[] = [];

  // Helper: find match in a model's predictions
  const findMatch = (modelPred: ModelPrediction, matchId: string): PredictionMatch | undefined => {
    // Search group stage
    for (const m of modelPred.group_stage_matches) {
      if (m.match_id === matchId) return m;
    }
    // Search knockout rounds
    const ko = modelPred.knockout_stage;
    for (const roundKey of ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals'] as const) {
      for (const m of ko[roundKey]) {
        if (m.match_id === matchId) return m;
      }
    }
    if (ko.third_place_match?.match_id === matchId) return ko.third_place_match;
    if (ko.final?.match_id === matchId) return ko.final;
    return undefined;
  };

  // Flatten tournament matches (group stage uses GS-XX, knockout uses R32-XX etc.)
  const allTourneyMatches: Array<{
    matchId: string;
    matchNum: number;
    stage: string;
    group: string | null;
    home: string;
    away: string;
    date: string;
    venue?: string;
  }> = [];

  // Group stage (match_ids 1-72 → GS-01 to GS-72)
  for (const m of tournament.matches) {
    allTourneyMatches.push({
      matchId: `GS-${String(m.match_id).padStart(2, '0')}`,
      matchNum: m.match_id,
      stage: 'group_stage',
      group: m.group,
      home: m.home_team,
      away: m.away_team,
      date: m.date,
      venue: `${m.venue.stadium}, ${m.venue.city}`,
    });
  }

  // Knockout stage
  for (const m of tournament.knockout_bracket) {
    let stage: string;
    let prefix: string;
    if (m.round === 'round_of_32') { stage = 'round_of_32'; prefix = 'R32'; }
    else if (m.round === 'round_of_16') { stage = 'round_of_16'; prefix = 'R16'; }
    else if (m.round === 'quarter_final') { stage = 'quarter_finals'; prefix = 'QF'; }
    else if (m.round === 'semi_final') { stage = 'semi_finals'; prefix = 'SF'; }
    else if (m.round === 'third_place') { stage = 'third_place_match'; prefix = 'THIRD'; }
    else if (m.round === 'final') { stage = 'final'; prefix = 'FINAL'; }
    else { stage = m.round; prefix = ''; }

    const matchId = m.round === 'third_place' ? 'THIRD' :
                    m.round === 'final' ? 'FINAL' :
                    `${prefix}-${m.match_id}`;

    allTourneyMatches.push({
      matchId,
      matchNum: m.match_id,
      stage,
      group: m.round === 'third_place' || m.round === 'final' ? null : null,
      home: m.home_team,
      away: m.away_team,
      date: m.date,
      venue: `${m.venue.stadium}, ${m.venue.city}`,
    });
  }

  // For each tournament match, compute consensus
  for (const tm of allTourneyMatches) {
    const modelsHome: string[] = [];
    const modelsDraw: string[] = [];
    const modelsAway: string[] = [];
    const modelPredictions: Record<string, any> = {};
    let homeScore = 0;
    let awayScore = 0;

    for (const modelName of ALL_MODELS) {
      const pred = predictions[modelName];
      if (!pred) continue;

      const match = findMatch(pred, tm.matchId);
      if (match) {
        modelPredictions[modelName] = {
          result: match.predicted_result,
          score: match.predicted_score,
          probs: match.probs,
        };
        if (match.predicted_result === 'home') modelsHome.push(modelName);
        else if (match.predicted_result === 'draw') modelsDraw.push(modelName);
        else if (match.predicted_result === 'away') modelsAway.push(modelName);
        // Use first model's score as representative
        if (Object.keys(modelPredictions).length === 1) {
          homeScore = match.predicted_score.home;
          awayScore = match.predicted_score.away;
        }
      }
    }

    const total = modelsHome.length + modelsDraw.length + modelsAway.length;
    if (total === 0) continue; // skip if no model predicted this match

    let majorityResult: 'home' | 'draw' | 'away';
    if (modelsHome.length >= modelsDraw.length && modelsHome.length >= modelsAway.length) {
      majorityResult = 'home';
    } else if (modelsDraw.length >= modelsAway.length) {
      majorityResult = 'draw';
    } else {
      majorityResult = 'away';
    }

    const majorityCount = Math.max(modelsHome.length, modelsDraw.length, modelsAway.length);
    const agreement = (majorityCount / total) * 100;

    entries.push({
      matchId: tm.matchId,
      stage: tm.stage,
      group: tm.group,
      homeTeam: tm.home,
      awayTeam: tm.away,
      homeScore,
      awayScore,
      date: tm.date,
      venue: tm.venue,
      counts: { home: modelsHome.length, draw: modelsDraw.length, away: modelsAway.length },
      total,
      agreement: Math.round(agreement * 10) / 10,
      majorityResult,
      modelsHome,
      modelsDraw,
      modelsAway,
      predictions: modelPredictions,
    });
  }

  return entries;
}

/**
 * Get champion consensus — count how many models pick each champion
 */
export function getChampionConsensus(): Array<{ team: string; count: number; pct: number }> {
  const counts: Record<string, number> = {};
  for (const name of ALL_MODELS) {
    const p = predictions[name];
    if (p) {
      const champ = p.final_standings.champion;
      counts[champ] = (counts[champ] || 0) + 1;
    }
  }
  const total = ALL_MODELS.length;
  return Object.entries(counts)
    .map(([team, count]) => ({ team, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get team consensus — for each team, how many models have them reaching
 * each stage (champion, runner_up, third, fourth, round of 16, etc.)
 * Based on knockout predictions.
 */
export function getTeamStageConsensus() {
  const stages = ['champion', 'runner_up', 'third_place', 'fourth_place'] as const;
  const teamCounts: Record<string, Record<string, number>> = {};

  for (const name of ALL_MODELS) {
    const p = predictions[name];
    if (!p) continue;
    const fs = p.final_standings;
    const entries = [
      { team: fs.champion, stage: 'champion' },
      { team: fs.runner_up, stage: 'runner_up' },
      { team: fs.third_place, stage: 'third_place' },
      { team: fs.fourth_place, stage: 'fourth_place' },
    ];
    for (const { team, stage } of entries) {
      if (!teamCounts[team]) teamCounts[team] = { champion: 0, runner_up: 0, third_place: 0, fourth_place: 0 };
      teamCounts[team][stage]++;
    }
  }

  return Object.entries(teamCounts)
    .map(([team, counts]) => ({
      team,
      champion: counts.champion,
      runnerUp: counts.runner_up,
      thirdPlace: counts.third_place,
      fourthPlace: counts.fourth_place,
      totalTop4: counts.champion + counts.runner_up + counts.third_place + counts.fourth_place,
    }))
    .sort((a, b) => b.champion - a.champion || b.runnerUp - a.runnerUp || b.thirdPlace - a.thirdPlace);
}

/**
 * Compute Brier score for a single match prediction.
 * Brier = (prob_home - actual_home)^2 + (prob_draw - actual_draw)^2 + (prob_away - actual_away)^2
 * Where actual is 1.0 for the outcome that happened, 0.0 otherwise.
 * Lower Brier → better calibrated.
 */
export function computeBrierScore(
  probs: { home: number; draw: number; away: number },
  actualResult: 'home' | 'draw' | 'away'
): number {
  const actual = { home: 0, draw: 0, away: 0 };
  actual[actualResult] = 1;
  const h = (probs.home - actual.home) ** 2;
  const d = (probs.draw - actual.draw) ** 2;
  const a = (probs.away - actual.away) ** 2;
  return Math.round((h + d + a) * 10000) / 10000;
}

/**
 * Evaluate all models against a set of real match results.
 * Returns updated leaderboard entries.
 */
export function evaluateResults(realResults: MatchResult[]): LeaderboardEntry[] {
  const consensus = buildConsensus();
  const realMap = new Map<number, MatchResult>();
  for (const r of realResults) {
    realMap.set(r.matchId, r);
  }

  const modelScores: Record<string, { correct: number; exact: number; total: number; brierTotal: number; brierCount: number }> = {};
  for (const name of ALL_MODELS) {
    modelScores[name] = { correct: 0, exact: 0, total: 0, brierTotal: 0, brierCount: 0 };
  }

  for (const entry of consensus) {
    // Map our matchId to the tournament match_id number
    // GS-01 → 1, R32-73 → 73, etc.
    let matchNum: number | null = null;
    if (entry.matchId.startsWith('GS-')) {
      matchNum = parseInt(entry.matchId.slice(3), 10);
    } else if (entry.matchId.startsWith('R32-')) {
      matchNum = parseInt(entry.matchId.slice(4), 10);
    } else if (entry.matchId.startsWith('R16-')) {
      matchNum = parseInt(entry.matchId.slice(4), 10);
    } else if (entry.matchId.startsWith('QF-')) {
      matchNum = parseInt(entry.matchId.slice(3), 10);
    } else if (entry.matchId.startsWith('SF-')) {
      matchNum = parseInt(entry.matchId.slice(3), 10);
    } else if (entry.matchId === 'THIRD') {
      matchNum = 103;
    } else if (entry.matchId === 'FINAL') {
      matchNum = 104;
    }

    if (matchNum === null) continue;
    const real = realMap.get(matchNum);
    if (!real) continue;

    const realResult = real.result;

    for (const modelName of ALL_MODELS) {
      const pred = entry.predictions[modelName];
      if (!pred) continue;

      const ms = modelScores[modelName];
      ms.total++;

      // Correct outcome?
      if (pred.result === realResult) {
        ms.correct++;
        // Exact score?
        if (pred.score.home === real.homeScore && pred.score.away === real.awayScore) {
          ms.exact++;
        }
      }

      // Brier score
      ms.brierTotal += computeBrierScore(pred.probs, realResult);
      ms.brierCount++;
    }
  }

  const entries: LeaderboardEntry[] = ALL_MODELS
    .map((name, i) => {
      const ms = modelScores[name];
      const p = predictions[name];
      const champ = p?.final_standings?.champion ?? '???';
      const runnerUp = p?.final_standings?.runner_up ?? '???';
      return {
        rank: 0, // will be set below
        modelName: name,
        correctOutcomes: ms.correct,
        exactScores: ms.exact,
        totalEvaluated: ms.total,
        accuracy: ms.total > 0 ? Math.round((ms.correct / ms.total) * 10000) / 100 : 0,
        brierAvg: ms.brierCount > 0 ? Math.round((ms.brierTotal / ms.brierCount) * 10000) / 10000 : null,
        bracketPoints: 0,
        champion: champ,
        runnerUp,
      };
    })
    .sort((a, b) => {
      // Sort by correct outcomes desc, then Brier (lower is better)
      if (b.correctOutcomes !== a.correctOutcomes) return b.correctOutcomes - a.correctOutcomes;
      if (a.brierAvg !== null && b.brierAvg !== null) return a.brierAvg - b.brierAvg;
      return 0;
    })
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return entries;
}

/**
 * Sanity check: validate the data layer loaded correctly.
 */
export function validate(): { ok: boolean; modelsLoaded: number; groupMatches: number; errors: string[] } {
  const errors: string[] = [];
  let groupMatches = 0;

  for (const name of ALL_MODELS) {
    const p = predictions[name];
    if (!p) {
      errors.push(`Missing prediction for ${name}`);
      continue;
    }
    if (!p.final_standings?.champion) {
      errors.push(`${name}: missing final_standings`);
    }
    if (p.group_stage_matches?.length) {
      groupMatches = p.group_stage_matches.length;
    }
    if (p.group_stage_matches?.length !== 72) {
      errors.push(`${name}: expected 72 group matches, got ${p.group_stage_matches?.length}`);
    }
  }

  return {
    ok: errors.length === 0,
    modelsLoaded: ALL_MODELS.length,
    groupMatches,
    errors,
  };
}
