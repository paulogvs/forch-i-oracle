// FORCH.i ORACLE — In-Memory Data Layer Implementation
// Full implementation of IDataLayer using in-memory Maps.
// Used as default until Supabase is connected.

import type { IDataLayer } from './interface';
import type {
  DBTeam,
  DBMatch,
  DBMatchPrediction,
  DBTeamForm,
  DBTournamentProbs,
  RealMatchResultInput,
  CronJobStatus,
  MatchStatus,
} from './types';
import { WORLD_CUP_TEAMS, ELO_RATINGS, POWER_RATINGS } from '../teams';
import { ALL_MATCHES } from '../matches';
import {
  getResults as getFileResults,
  saveResult as saveFileResult,
  clearResults as clearFileResults,
  getForms as getFileForms,
  saveForm as saveFileForm,
  getPredictions as getFilePredictions,
  savePrediction as saveFilePrediction,
  clearPredictions as clearFilePredictions,
} from '../file-store';

// ═══════════════════════════════════════════════════════════════
// IN-Memory Store
// ═══════════════════════════════════════════════════════════════

const teamsStore = new Map<string, DBTeam>();
const matchesStore = new Map<string, DBMatch>();
const predictionsStore = new Map<string, DBMatchPrediction>();
const teamFormsStore = new Map<string, DBTeamForm>();
const tournamentProbsStore = new Map<string, DBTournamentProbs>();
const matchResultsStore: RealMatchResultInput[] = [];
const cronStatusStore = new Map<string, CronJobStatus>();

let initialized = false;

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION — Seed from existing static data
// ═══════════════════════════════════════════════════════════════

function ensureInitialized(): void {
  if (initialized) return;

  // Seed teams
  for (const t of WORLD_CUP_TEAMS) {
    const elo = ELO_RATINGS[t.name]?.elo ?? 1500;
    const power = POWER_RATINGS[t.name] ?? { attack: 50, defense: 50, midfield: 50 };
    teamsStore.set(t.name, {
      id: t.name,
      fifaCode: t.code,
      name: t.name,
      groupChar: t.group,
      confederation: t.confederation,
      eloRating: elo,
      powerRatings: power,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Seed matches
  for (const m of ALL_MATCHES) {
    matchesStore.set(m.id, {
      id: m.id,
      matchNumber: m.matchday,
      groupChar: m.group,
      round: m.round === 'group' ? 'group' :
        m.round === 'round-32' ? 'R32' :
        m.round === 'round-16' ? 'R16' :
        m.round === 'quarter' ? 'QF' :
        m.round === 'semi' ? 'SF' :
        m.round === 'third' ? 'F' : 'F',
      homeTeamId: m.homeTeam,
      awayTeamId: m.awayTeam,
      matchDate: m.date,
      matchTime: m.time,
      venue: m.venue,
      city: m.city,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    } as any);
  }

  initialized = true;
}

// ═══════════════════════════════════════════════════════════════
// TEAMS
// ═══════════════════════════════════════════════════════════════

async function getTeam(id: string): Promise<DBTeam | null> {
  ensureInitialized();
  return teamsStore.get(id) ?? null;
}

async function getTeamByCode(fifaCode: string): Promise<DBTeam | null> {
  ensureInitialized();
  const allTeams = Array.from(teamsStore.values());
  for (let i = 0; i < allTeams.length; i++) {
    if (allTeams[i].fifaCode === fifaCode) return allTeams[i];
  }
  return null;
}

async function getTeamByName(name: string): Promise<DBTeam | null> {
  ensureInitialized();
  const lower = name.toLowerCase();
  const allTeams = Array.from(teamsStore.values());
  for (let i = 0; i < allTeams.length; i++) {
    if (allTeams[i].name.toLowerCase() === lower) return allTeams[i];
  }
  return null;
}

async function getAllTeams(): Promise<DBTeam[]> {
  ensureInitialized();
  return Array.from(teamsStore.values());
}

async function getTeamsByGroup(groupChar: string): Promise<DBTeam[]> {
  ensureInitialized();
  return Array.from(teamsStore.values()).filter(t => t.groupChar === groupChar);
}

async function upsertTeam(team: Omit<DBTeam, 'createdAt' | 'updatedAt'>): Promise<DBTeam> {
  ensureInitialized();
  const existing = teamsStore.get(team.id);
  const now = new Date().toISOString();
  const upserted: DBTeam = {
    ...team,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  teamsStore.set(team.id, upserted);
  return upserted;
}

// ═══════════════════════════════════════════════════════════════
// MATCHES
// ═══════════════════════════════════════════════════════════════

async function getMatch(id: string): Promise<DBMatch | null> {
  ensureInitialized();
  return matchesStore.get(id) ?? null;
}

async function getMatchByNumber(number: number): Promise<DBMatch | null> {
  ensureInitialized();
  const allMatches = Array.from(matchesStore.values());
  for (let i = 0; i < allMatches.length; i++) {
    if (allMatches[i].matchNumber === number) return allMatches[i];
  }
  return null;
}

async function getMatchesByGroup(groupChar: string): Promise<DBMatch[]> {
  ensureInitialized();
  return Array.from(matchesStore.values()).filter(m => m.groupChar === groupChar);
}

async function getMatchesByStatus(status: MatchStatus): Promise<DBMatch[]> {
  ensureInitialized();
  return Array.from(matchesStore.values()).filter(m => m.status === status);
}

async function getUpcomingMatches(): Promise<DBMatch[]> {
  ensureInitialized();
  return Array.from(matchesStore.values())
    .filter(m => m.status === 'scheduled')
    .sort((a, b) => {
      if (!a.matchDate) return 1;
      if (!b.matchDate) return -1;
      return a.matchDate.localeCompare(b.matchDate);
    });
}

async function getAllMatches(): Promise<DBMatch[]> {
  ensureInitialized();
  return Array.from(matchesStore.values());
}

async function updateMatch(id: string, updates: Partial<DBMatch>): Promise<DBMatch> {
  ensureInitialized();
  const existing = matchesStore.get(id);
  if (!existing) throw new Error(`Match not found: ${id}`);
  const updated: DBMatch = { ...existing, ...updates };
  matchesStore.set(id, updated);
  return updated;
}

async function getMatchByTeams(homeTeamName: string, awayTeamName: string): Promise<DBMatch | null> {
  ensureInitialized();
  const allMatches = Array.from(matchesStore.values());
  for (let i = 0; i < allMatches.length; i++) {
    const m = allMatches[i];
    const homeMatch = m.homeTeamId.toLowerCase() === homeTeamName.toLowerCase();
    const awayMatch = m.awayTeamId.toLowerCase() === awayTeamName.toLowerCase();
    if (homeMatch && awayMatch) return m;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════

async function getPrediction(matchId: string): Promise<DBMatchPrediction | null> {
  ensureInitialized();
  return predictionsStore.get(matchId) ?? null;
}

async function getPredictionsForMatches(matchIds: string[]): Promise<DBMatchPrediction[]> {
  ensureInitialized();
  const results: DBMatchPrediction[] = [];
  for (const id of matchIds) {
    const pred = predictionsStore.get(id);
    if (pred) results.push(pred);
  }
  return results;
}

async function savePrediction(prediction: Omit<DBMatchPrediction, 'id' | 'predictedAt'>): Promise<DBMatchPrediction> {
  ensureInitialized();
  const now = new Date().toISOString();
  const saved: DBMatchPrediction = {
    ...prediction,
    id: prediction.matchId,
    predictedAt: now,
  };
  predictionsStore.set(prediction.matchId, saved);

  // Persist to file store
  saveFilePrediction({
    matchId: prediction.matchId,
    homeWin: prediction.homeWin,
    draw: prediction.draw,
    awayWin: prediction.awayWin,
    mostLikelyScore: prediction.mostLikelyScore,
    expectedGoalsHome: prediction.expectedGoalsHome,
    expectedGoalsAway: prediction.expectedGoalsAway,
    over25Probability: prediction.over25Probability,
    bttsProbability: prediction.bttsProbability,
    confidence: prediction.confidence,
    dataQualityScore: prediction.dataQualityScore,
    modelVersion: prediction.modelVersion,
    topScores: prediction.topScores || [],
  });

  return saved;
}

async function savePredictions(
  predictions: Array<Omit<DBMatchPrediction, 'id' | 'predictedAt'>>
): Promise<DBMatchPrediction[]> {
  ensureInitialized();
  const now = new Date().toISOString();
  const saved: DBMatchPrediction[] = predictions.map(p => ({
    ...p,
    id: p.matchId,
    predictedAt: now,
  }));
  for (const s of saved) {
    predictionsStore.set(s.matchId, s);
  }
  return saved;
}

async function deletePrediction(matchId: string): Promise<void> {
  ensureInitialized();
  predictionsStore.delete(matchId);
}

// ═══════════════════════════════════════════════════════════════
// TEAM FORM
// ═══════════════════════════════════════════════════════════════

async function getTeamForm(teamId: string): Promise<DBTeamForm | null> {
  ensureInitialized();
  return teamFormsStore.get(teamId) ?? null;
}

async function saveTeamForm(form: Omit<DBTeamForm, 'id' | 'updatedAt'>): Promise<DBTeamForm> {
  ensureInitialized();
  const now = new Date().toISOString();
  const saved: DBTeamForm = {
    ...form,
    id: form.teamId,
    updatedAt: now,
  };
  teamFormsStore.set(form.teamId, saved);

  // Persist to file store
  saveFileForm({
    teamId: form.teamId,
    last5: form.last5,
    xgFor: form.xgFor,
    xgAgainst: form.xgAgainst,
    momentum: form.momentum,
    matchesPlayed: form.matchesPlayed,
    eloDynamic: form.eloDynamic ?? 1500,
    updatedAt: now,
  });

  return saved;
}

async function getAllTeamForms(): Promise<DBTeamForm[]> {
  ensureInitialized();
  return Array.from(teamFormsStore.values());
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROBABILITIES
// ═══════════════════════════════════════════════════════════════

async function getTournamentProbs(): Promise<DBTournamentProbs[]> {
  ensureInitialized();
  return Array.from(tournamentProbsStore.values())
    .sort((a, b) => b.championProb - a.championProb);
}

async function getTournamentProb(teamId: string): Promise<DBTournamentProbs | null> {
  ensureInitialized();
  return tournamentProbsStore.get(teamId) ?? null;
}

async function saveTournamentProbs(
  probs: Array<Omit<DBTournamentProbs, 'id' | 'calculatedAt'>>
): Promise<DBTournamentProbs[]> {
  ensureInitialized();
  const now = new Date().toISOString();
  const saved: DBTournamentProbs[] = probs.map(p => ({
    ...p,
    id: p.teamId,
    calculatedAt: now,
  }));
  for (const s of saved) {
    tournamentProbsStore.set(s.teamId, s);
  }
  return saved;
}

// ═══════════════════════════════════════════════════════════════
// MATCH RESULTS
// ═══════════════════════════════════════════════════════════════

async function submitMatchResult(input: RealMatchResultInput): Promise<void> {
  // Check if already exists, replace if so
  const idx = matchResultsStore.findIndex(r => r.matchId === input.matchId);
  if (idx >= 0) {
    matchResultsStore[idx] = input;
  } else {
    matchResultsStore.push(input);
  }

  // Persist to file store
  saveFileResult({
    matchId: input.matchId,
    homeTeam: (matchResultsStore.find(r => r.matchId === input.matchId) as any)?.homeTeamId || '',
    awayTeam: (matchResultsStore.find(r => r.matchId === input.matchId) as any)?.awayTeamId || '',
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    winner: input.winner,
    submittedAt: new Date().toISOString(),
  });

  // Update match status and score
  ensureInitialized();
  const match = matchesStore.get(input.matchId);
  if (match) {
    matchesStore.set(match.id, {
      ...match,
      status: 'finished',
      scoreHome: input.homeScore,
      scoreAway: input.awayScore,
    });
  }
}

async function getMatchResults(): Promise<RealMatchResultInput[]> {
  // Merge in-memory + file results (file results persist across requests)
  const fileResults = getFileResults();
  const fileIds = new Set(matchResultsStore.map(r => r.matchId));
  const merged = [...matchResultsStore];
  for (const fr of fileResults) {
    if (!fileIds.has(fr.matchId)) {
      merged.push(fr as any);
    }
  }
  return merged;
}

async function clearMatchResults(): Promise<void> {
  matchResultsStore.length = 0;
  clearFileResults();
}

// ═══════════════════════════════════════════════════════════════
// CRON STATUS
// ═══════════════════════════════════════════════════════════════

async function updateCronStatus(status: CronJobStatus): Promise<void> {
  cronStatusStore.set(status.jobName, status);
}

async function getCronStatus(jobName: string): Promise<CronJobStatus | null> {
  return cronStatusStore.get(jobName) ?? null;
}

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

async function seedTeams(teams: Omit<DBTeam, 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const now = new Date().toISOString();
  for (const t of teams) {
    teamsStore.set(t.id, { ...t, createdAt: now, updatedAt: now });
  }
}

async function seedMatches(matches: Omit<DBMatch, 'createdAt'>[]): Promise<void> {
  const now = new Date().toISOString();
  for (const m of matches) {
    matchesStore.set(m.id, { ...m, createdAt: now });
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT — Singleton instance
// ═══════════════════════════════════════════════════════════════

export const inMemoryDataLayer: IDataLayer = {
  getTeam,
  getTeamByCode,
  getTeamByName,
  getAllTeams,
  getTeamsByGroup,
  upsertTeam,
  getMatch,
  getMatchByNumber,
  getMatchesByGroup,
  getMatchesByStatus,
  getUpcomingMatches,
  getAllMatches,
  updateMatch,
  getMatchByTeams,
  getPrediction,
  getPredictionsForMatches,
  savePrediction,
  savePredictions,
  deletePrediction,
  getTeamForm,
  saveTeamForm,
  getAllTeamForms,
  getTournamentProbs,
  getTournamentProb,
  saveTournamentProbs,
  submitMatchResult,
  getMatchResults,
  clearMatchResults,
  updateCronStatus,
  getCronStatus,
  seedTeams,
  seedMatches,
};
