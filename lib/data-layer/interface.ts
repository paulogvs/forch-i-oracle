// FORCH.i ORACLE — Data Layer Interface
// Abstract interface that all implementations must satisfy.

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
  DBKeyValue,
} from './types';

export interface IDataLayer {
  // ─── TEAMS ───────────────────────────────────────────────
  getTeam(id: string): Promise<DBTeam | null>;
  getTeamByCode(fifaCode: string): Promise<DBTeam | null>;
  getTeamByName(name: string): Promise<DBTeam | null>;
  getAllTeams(): Promise<DBTeam[]>;
  getTeamsByGroup(groupChar: string): Promise<DBTeam[]>;
  upsertTeam(team: Omit<DBTeam, 'createdAt' | 'updatedAt'>): Promise<DBTeam>;

  // ─── MATCHES ─────────────────────────────────────────────
  getMatch(id: string): Promise<DBMatch | null>;
  getMatchByNumber(number: number): Promise<DBMatch | null>;
  getMatchesByGroup(groupChar: string): Promise<DBMatch[]>;
  getMatchesByStatus(status: MatchStatus): Promise<DBMatch[]>;
  getUpcomingMatches(): Promise<DBMatch[]>;
  getAllMatches(): Promise<DBMatch[]>;
  updateMatch(id: string, updates: Partial<DBMatch>): Promise<DBMatch>;
  getMatchByTeams(homeTeamName: string, awayTeamName: string): Promise<DBMatch | null>;

  // ─── PREDICTIONS ─────────────────────────────────────────
  getPrediction(matchId: string): Promise<DBMatchPrediction | null>;
  getPredictionsForMatches(matchIds: string[]): Promise<DBMatchPrediction[]>;
  savePrediction(prediction: Omit<DBMatchPrediction, 'id' | 'predictedAt'>): Promise<DBMatchPrediction>;
  savePredictions(predictions: Array<Omit<DBMatchPrediction, 'id' | 'predictedAt'>>): Promise<DBMatchPrediction[]>;
  deletePrediction(matchId: string): Promise<void>;

  // ─── TEAM FORM ───────────────────────────────────────────
  getTeamForm(teamId: string): Promise<DBTeamForm | null>;
  saveTeamForm(form: Omit<DBTeamForm, 'id' | 'updatedAt'>): Promise<DBTeamForm>;
  getAllTeamForms(): Promise<DBTeamForm[]>;

  // ─── TOURNAMENT PROBABILITIES ────────────────────────────
  getTournamentProbs(): Promise<DBTournamentProbs[]>;
  getTournamentProb(teamId: string): Promise<DBTournamentProbs | null>;
  saveTournamentProbs(probs: Array<Omit<DBTournamentProbs, 'id' | 'calculatedAt'>>): Promise<DBTournamentProbs[]>;

  // ─── MATCH RESULTS ──────────────────────────────────────
  submitMatchResult(input: RealMatchResultInput): Promise<void>;
  getMatchResults(): Promise<RealMatchResultInput[]>;
  clearMatchResults(): Promise<void>;

  // ─── CRON STATUS ────────────────────────────────────────
  updateCronStatus(status: CronJobStatus): Promise<void>;
  getCronStatus(jobName: string): Promise<CronJobStatus | null>;

  // ─── ACCURACY METRICS ───────────────────────────────────
  getAccuracyMetrics(matchId: string): Promise<DBAccuracyMetric | null>;
  getAllAccuracyMetrics(): Promise<DBAccuracyMetric[]>;
  saveAccuracyMetric(metric: Omit<DBAccuracyMetric, 'id' | 'evaluatedAt'>): Promise<DBAccuracyMetric>;
  getOverallAccuracy(): Promise<{ total: number; correct: number; accuracy: number; avgBrier: number }>;

  // ─── BULK OPERATIONS (for cron jobs) ────────────────────
  seedTeams(teams: Omit<DBTeam, 'createdAt' | 'updatedAt'>[]): Promise<void>;
  seedMatches(matches: Omit<DBMatch, 'createdAt'>[]): Promise<void>;

  // ─── KEY-VALUE STORE ────────────────────────────────────
  getKeyValue(key: string): Promise<DBKeyValue | null>;
  setKeyValue(key: string, value: unknown): Promise<void>;
}
