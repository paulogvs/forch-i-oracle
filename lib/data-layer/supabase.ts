// FORCH.i ORACLE — Supabase Data Layer Implementation
// Full implementation of IDataLayer using Supabase PostgreSQL.
// This file is loaded dynamically ONLY when Supabase is configured.
// DO NOT import this file directly — use getDataLayerAsync() from index.ts

import type { IDataLayer } from './interface';
import type {
  DBTeam,
  DBMatch,
  DBMatchPrediction,
  DBTeamForm,
  DBTournamentProbs,
  DBAccuracyMetric,
  RealMatchResultInput,
  CronJobStatus,
  MatchStatus,
  MatchRound,
} from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabase: any = null;

function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(url, key);
  return supabase;
}

// ═══════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════

async function getTeam(id: string): Promise<DBTeam | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('teams').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapTeamRow(data);
}

async function getTeamByCode(fifaCode: string): Promise<DBTeam | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('teams').select('*').eq('fifa_code', fifaCode).single();
  if (error || !data) return null;
  return mapTeamRow(data);
}

async function getTeamByName(name: string): Promise<DBTeam | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('teams').select('*').ilike('name', name).single();
  if (error || !data) return null;
  return mapTeamRow(data);
}

async function getAllTeams(): Promise<DBTeam[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('teams').select('*').order('group_char', { ascending: true });
  if (error || !data) return [];
  return data.map(mapTeamRow);
}

async function getTeamsByGroup(groupChar: string): Promise<DBTeam[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('teams').select('*').eq('group_char', groupChar);
  if (error || !data) return [];
  return data.map(mapTeamRow);
}

async function upsertTeam(team: Omit<DBTeam, 'createdAt' | 'updatedAt'>): Promise<DBTeam> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const now = new Date().toISOString();
  const { data, error } = await client.from('teams').upsert({
    id: team.id, fifa_code: team.fifaCode, name: team.name,
    group_char: team.groupChar, confederation: team.confederation,
    elo_rating: team.eloRating, power_ratings: team.powerRatings, updated_at: now,
  }, { onConflict: 'id' }).select().single();
  if (error || !data) throw new Error(`Failed to upsert team: ${error?.message}`);
  return mapTeamRow(data);
}

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════

async function getMatch(id: string): Promise<DBMatch | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('matches').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapMatchRow(data);
}

async function getMatchByNumber(number: number): Promise<DBMatch | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('matches').select('*').eq('match_number', number).single();
  if (error || !data) return null;
  return mapMatchRow(data);
}

async function getMatchesByGroup(groupChar: string): Promise<DBMatch[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('matches').select('*').eq('group_char', groupChar).order('match_date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMatchRow);
}

async function getMatchesByStatus(status: MatchStatus): Promise<DBMatch[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('matches').select('*').eq('status', status).order('match_date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMatchRow);
}

async function getUpcomingMatches(): Promise<DBMatch[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('matches').select('*').eq('status', 'scheduled').order('match_date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMatchRow);
}

async function getAllMatches(): Promise<DBMatch[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('matches').select('*').order('match_date', { ascending: true });
  if (error || !data) return [];
  return data.map(mapMatchRow);
}

async function updateMatch(id: string, updates: Partial<DBMatch>): Promise<DBMatch> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.scoreHome !== undefined) dbUpdates.score_home = updates.scoreHome;
  if (updates.scoreAway !== undefined) dbUpdates.score_away = updates.scoreAway;
  const { data, error } = await client.from('matches').update(dbUpdates).eq('id', id).select().single();
  if (error || !data) throw new Error(`Failed to update match: ${error?.message}`);
  return mapMatchRow(data);
}

async function getMatchByTeams(homeTeamName: string, awayTeamName: string): Promise<DBMatch | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('matches').select('*').ilike('home_team_id', homeTeamName).ilike('away_team_id', awayTeamName).single();
  if (error || !data) return null;
  return mapMatchRow(data);
}

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════

async function getPrediction(matchId: string): Promise<DBMatchPrediction | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('match_predictions').select('*').eq('match_id', matchId).order('predicted_at', { ascending: false }).limit(1).single();
  if (error || !data) return null;
  return mapPredictionRow(data);
}

async function getPredictionsForMatches(matchIds: string[]): Promise<DBMatchPrediction[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('match_predictions').select('*').in('match_id', matchIds);
  if (error || !data) return [];
  return data.map(mapPredictionRow);
}

async function savePrediction(prediction: Omit<DBMatchPrediction, 'id' | 'predictedAt'>): Promise<DBMatchPrediction> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client.from('match_predictions').upsert({
    match_id: prediction.matchId,
    prob_team1_win: prediction.homeWin, prob_draw: prediction.draw, prob_team2_win: prediction.awayWin,
    most_likely_score: prediction.mostLikelyScore,
    expected_goals_team1: prediction.expectedGoalsHome, expected_goals_team2: prediction.expectedGoalsAway,
    key_factors: prediction.keyFactors,
    confidence_score: prediction.confidence === 'alta' ? 75 : prediction.confidence === 'media' ? 50 : 25,
    data_quality_score: prediction.dataQualityScore, model_version: prediction.modelVersion,
    analysis: prediction.analysis, home_key_players: prediction.homeKeyPlayers, away_key_players: prediction.awayKeyPlayers,
  }, { onConflict: 'match_id,model_version' }).select().single();
  if (error || !data) throw new Error(`Failed to save prediction: ${error?.message}`);
  return mapPredictionRow(data);
}

async function savePredictions(predictions: Array<Omit<DBMatchPrediction, 'id' | 'predictedAt'>>): Promise<DBMatchPrediction[]> {
  const saved: DBMatchPrediction[] = [];
  for (const p of predictions) { try { saved.push(await savePrediction(p)); } catch { /* skip */ } }
  return saved;
}

async function deletePrediction(matchId: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.from('match_predictions').delete().eq('match_id', matchId);
}

// ═══════════════════════════════════════════════════════════════
// TEAM FORM
// ═══════════════════════════════════════════════════════════════

async function getTeamForm(teamId: string): Promise<DBTeamForm | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('team_form').select('*').eq('team_id', teamId).single();
  if (error || !data) return null;
  return mapFormRow(data);
}

async function saveTeamForm(form: Omit<DBTeamForm, 'id' | 'updatedAt'>): Promise<DBTeamForm> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const now = new Date().toISOString();
  const { data, error } = await client.from('team_form').upsert({
    team_id: form.teamId, last_5: form.last5, xg_for: form.xgFor, xg_against: form.xgAgainst,
    momentum: form.momentum, matches_played: form.matchesPlayed, elo_dynamic: form.eloDynamic, updated_at: now,
  }, { onConflict: 'team_id' }).select().single();
  if (error || !data) throw new Error(`Failed to save team form: ${error?.message}`);
  return mapFormRow(data);
}

async function getAllTeamForms(): Promise<DBTeamForm[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('team_form').select('*');
  if (error || !data) return [];
  return data.map(mapFormRow);
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROBABILITIES
// ═══════════════════════════════════════════════════════════════

async function getTournamentProbs(): Promise<DBTournamentProbs[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('champion_probabilities').select('*').order('probability', { ascending: false });
  if (error || !data) return [];
  return data.map(mapProbRow);
}

async function getTournamentProb(teamId: string): Promise<DBTournamentProbs | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('champion_probabilities').select('*').eq('team_id', teamId).single();
  if (error || !data) return null;
  return mapProbRow(data);
}

async function saveTournamentProbs(probs: Array<Omit<DBTournamentProbs, 'id' | 'calculatedAt'>>): Promise<DBTournamentProbs[]> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const saved: DBTournamentProbs[] = [];
  for (const p of probs) {
    try {
      const now = new Date().toISOString();
      const { data, error } = await client.from('champion_probabilities').upsert({
        team_id: p.teamId, probability: p.championProb, simulations_count: p.simulationsCount,
        total_simulations: p.totalSimulations, calculated_at: now,
      }, { onConflict: 'team_id' }).select().single();
      if (data && !error) saved.push(mapProbRow(data));
    } catch { /* skip */ }
  }
  return saved;
}

// ═══════════════════════════════════════════════════════════════
// MATCH RESULTS
// ═══════════════════════════════════════════════════════════════

async function submitMatchResult(input: RealMatchResultInput): Promise<void> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  await client.from('matches').update({ status: 'finished', score_home: input.homeScore, score_away: input.awayScore }).eq('id', input.matchId);
}

async function getMatchResults(): Promise<RealMatchResultInput[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('matches').select('id, score_home, score_away').eq('status', 'finished');
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    matchId: row.id as string, homeScore: row.score_home as number, awayScore: row.score_away as number,
    winner: (row.score_home as number) > (row.score_away as number) ? 'home' : (row.score_home as number) < (row.score_away as number) ? 'away' : 'draw',
  }));
}

async function clearMatchResults(): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.from('matches').update({ status: 'scheduled', score_home: null, score_away: null }).eq('status', 'finished');
}

// ═══════════════════════════════════════════════════════════════
// CRON STATUS
// ═══════════════════════════════════════════════════════════════

async function updateCronStatus(status: CronJobStatus): Promise<void> {
  const client = getClient();
  if (!client) return;
  await client.from('cron_job_status').upsert({
    job_name: status.jobName, last_run: status.lastRun, status: status.status,
    duration_ms: status.durationMs, records_processed: status.recordsProcessed, error: status.error,
  }, { onConflict: 'job_name' });
}

async function getCronStatus(jobName: string): Promise<CronJobStatus | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('cron_job_status').select('*').eq('job_name', jobName).single();
  if (error || !data) return null;
  return {
    jobName: data.job_name as string, lastRun: data.last_run as string,
    status: data.status as 'success' | 'failed' | 'running',
    durationMs: data.duration_ms as number | undefined, recordsProcessed: data.records_processed as number | undefined,
    error: data.error as string | undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// ACCURACY METRICS
// ═══════════════════════════════════════════════════════════════

async function getAccuracyMetrics(matchId: string): Promise<DBAccuracyMetric | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('accuracy_metrics').select('*').eq('match_id', matchId).single();
  if (error || !data) return null;
  return mapAccuracyRow(data);
}

async function getAllAccuracyMetrics(): Promise<DBAccuracyMetric[]> {
  const client = getClient();
  if (!client) return [];
  const { data, error } = await client.from('accuracy_metrics').select('*').order('evaluated_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapAccuracyRow);
}

async function saveAccuracyMetric(metric: Omit<DBAccuracyMetric, 'id' | 'evaluatedAt'>): Promise<DBAccuracyMetric> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const { data, error } = await client.from('accuracy_metrics').upsert({
    match_id: metric.matchId,
    predicted_home_win: metric.predictedHomeWin,
    predicted_draw: metric.predictedDraw,
    predicted_away_win: metric.predictedAwayWin,
    actual_result: metric.actualResult,
    predicted_correct: metric.predictedCorrect,
    brier_score: metric.brierScore,
    log_loss: metric.logLoss,
    model_version: metric.modelVersion,
  }, { onConflict: 'match_id' }).select().single();
  if (error || !data) throw new Error(`Failed to save accuracy metric: ${error?.message}`);
  return mapAccuracyRow(data);
}

async function getOverallAccuracy(): Promise<{ total: number; correct: number; accuracy: number; avgBrier: number }> {
  const client = getClient();
  if (!client) return { total: 0, correct: 0, accuracy: 0, avgBrier: 0 };
  const { data, error } = await client.from('accuracy_metrics').select('predicted_correct, brier_score');
  if (error || !data || data.length === 0) return { total: 0, correct: 0, accuracy: 0, avgBrier: 0 };
  const total = data.length;
  const correct = data.filter((r: Record<string, unknown>) => r.predicted_correct).length;
  const avgBrier = data.reduce((sum: number, r: Record<string, unknown>) => sum + (Number(r.brier_score) || 0), 0) / total;
  return { total, correct, accuracy: Math.round((correct / total) * 100), avgBrier: Math.round(avgBrier * 1000) / 1000 };
}

// ═══════════════════════════════════════════════════════════════
// BULK
// ═══════════════════════════════════════════════════════════════

async function seedTeams(teams: Omit<DBTeam, 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const { error } = await client.from('teams').upsert(teams.map(t => ({
    id: t.id, fifa_code: t.fifaCode, name: t.name, group_char: t.groupChar,
    confederation: t.confederation, elo_rating: t.eloRating, power_ratings: t.powerRatings,
  })), { onConflict: 'id' });
  if (error) throw new Error(`Failed to seed teams: ${error.message}`);
}

async function seedMatches(matches: Omit<DBMatch, 'createdAt'>[]): Promise<void> {
  const client = getClient();
  if (!client) throw new Error('Supabase not configured');
  const { error } = await client.from('matches').upsert(matches.map(m => ({
    id: m.id, match_number: m.matchNumber, group_char: m.groupChar, round: m.round,
    home_team_id: m.homeTeamId, away_team_id: m.awayTeamId, match_date: m.matchDate,
    venue: m.venue, city: m.city, status: m.status,
  })), { onConflict: 'id' });
  if (error) throw new Error(`Failed to seed matches: ${error.message}`);
}

// ═══════════════════════════════════════════════════════════════
// ROW MAPPERS
// ═══════════════════════════════════════════════════════════════

function mapTeamRow(row: Record<string, unknown>): DBTeam {
  return {
    id: row.id as string, fifaCode: row.fifa_code as string, name: row.name as string,
    groupChar: row.group_char as string, confederation: row.confederation as string,
    eloRating: Number(row.elo_rating ?? 1500),
    powerRatings: (row.power_ratings as { attack: number; defense: number; midfield: number }) ?? { attack: 50, defense: 50, midfield: 50 },
    createdAt: row.created_at as string, updatedAt: row.updated_at as string,
  };
}

function mapMatchRow(row: Record<string, unknown>): DBMatch {
  return {
    id: row.id as string, matchNumber: row.match_number as number | undefined,
    groupChar: row.group_char as string | undefined, round: (row.round as MatchRound) ?? 'group',
    homeTeamId: row.home_team_id as string, awayTeamId: row.away_team_id as string,
    matchDate: row.match_date as string | undefined, matchTime: row.match_time as string | undefined,
    venue: row.venue as string | undefined, city: row.city as string | undefined,
    status: (row.status as MatchStatus) ?? 'scheduled',
    scoreHome: row.score_home as number | undefined, scoreAway: row.score_away as number | undefined,
    createdAt: row.created_at as string,
  };
}

function mapPredictionRow(row: Record<string, unknown>): DBMatchPrediction {
  return {
    id: row.id as string, matchId: row.match_id as string,
    homeWin: Number(row.prob_team1_win ?? 40), draw: Number(row.prob_draw ?? 30), awayWin: Number(row.prob_team2_win ?? 30),
    mostLikelyScore: (row.most_likely_score as string) ?? '1-1',
    expectedGoalsHome: Number(row.expected_goals_team1 ?? 1.2), expectedGoalsAway: Number(row.expected_goals_team2 ?? 1.0),
    over25Probability: Number(row.over_25_probability ?? 50), bttsProbability: Number(row.btts_probability ?? 45),
    keyFactors: (row.key_factors as unknown[]) ?? [],
    confidence: row.confidence_score && Number(row.confidence_score) >= 65 ? 'alta' : Number(row.confidence_score) >= 40 ? 'media' : 'baja',
    dataQualityScore: Number(row.data_quality_score ?? 50), modelVersion: (row.model_version as string) ?? '2.0',
    predictedAt: row.predicted_at as string,
    analysis: row.analysis as string | undefined, homeKeyPlayers: row.home_key_players as string[] | undefined,
    awayKeyPlayers: row.away_key_players as string[] | undefined,
  };
}

function mapFormRow(row: Record<string, unknown>): DBTeamForm {
  return {
    id: row.id as string, teamId: row.team_id as string,
    last5: (row.last_5 as DBTeamForm['last5']) ?? [], xgFor: Number(row.xg_for ?? 0),
    xgAgainst: Number(row.xg_against ?? 0), momentum: Number(row.momentum ?? 0),
    matchesPlayed: Number(row.matches_played ?? 0), eloDynamic: Number(row.elo_dynamic ?? 1500),
    updatedAt: row.updated_at as string,
  };
}

function mapProbRow(row: Record<string, unknown>): DBTournamentProbs {
  return {
    id: row.id as string, teamId: row.team_id as string, championProb: Number(row.probability ?? 0),
    simulationsCount: Number(row.simulations_count ?? 0), totalSimulations: Number(row.total_simulations ?? 100),
    calculatedAt: row.calculated_at as string,
  };
}

function mapAccuracyRow(row: Record<string, unknown>): DBAccuracyMetric {
  return {
    id: row.id as string, matchId: row.match_id as string,
    predictedHomeWin: Number(row.predicted_home_win ?? 0), predictedDraw: Number(row.predicted_draw ?? 0),
    predictedAwayWin: Number(row.predicted_away_win ?? 0),
    actualResult: (row.actual_result as 'home' | 'draw' | 'away') ?? 'home',
    predictedCorrect: Boolean(row.predicted_correct),
    brierScore: Number(row.brier_score ?? 0), logLoss: Number(row.log_loss ?? 0),
    modelVersion: (row.model_version as string) ?? '2.0',
    evaluatedAt: row.evaluated_at as string,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const supabaseDataLayer: IDataLayer = {
  getTeam, getTeamByCode, getTeamByName, getAllTeams, getTeamsByGroup, upsertTeam,
  getMatch, getMatchByNumber, getMatchesByGroup, getMatchesByStatus, getUpcomingMatches, getAllMatches, updateMatch, getMatchByTeams,
  getPrediction, getPredictionsForMatches, savePrediction, savePredictions, deletePrediction,
  getTeamForm, saveTeamForm, getAllTeamForms,
  getTournamentProbs, getTournamentProb, saveTournamentProbs,
  getAccuracyMetrics, getAllAccuracyMetrics, saveAccuracyMetric, getOverallAccuracy,
  submitMatchResult, getMatchResults, clearMatchResults,
  updateCronStatus, getCronStatus,
  seedTeams, seedMatches,
};
