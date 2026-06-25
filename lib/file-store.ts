// FORCH.i ORACLE — File-based persistence store
// Persists match results, team forms, and predictions to JSON files.
// Works in Vercel serverless (writes to /tmp) and local dev (writes to data/).

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp/forchi-oracle' : path.join(process.cwd(), '.forchi-data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'predictions.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    ensureDir();
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return fallback;
}

function writeJson<T>(filePath: string, data: T): void {
  try {
    ensureDir();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* ignore in serverless if read-only */ }
}

// ═══════════════════════════════════════════════════════════════
// MATCH RESULTS
// ═══════════════════════════════════════════════════════════════

export interface PersistedResult {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  submittedAt: string;
}

export function getResults(): PersistedResult[] {
  return readJson<PersistedResult[]>(RESULTS_FILE, []);
}

export function saveResult(result: PersistedResult): void {
  const results = getResults();
  // Don't duplicate
  if (results.find(r => r.matchId === result.matchId)) return;
  results.push(result);
  writeJson(RESULTS_FILE, results);
}

export function clearResults(): void {
  writeJson(RESULTS_FILE, []);
}

// ═══════════════════════════════════════════════════════════════
// TEAM FORMS
// ═══════════════════════════════════════════════════════════════

export interface PersistedForm {
  teamId: string;
  last5: { result: string; opponent: string; goalsFor: number; goalsAgainst: number; date: string }[];
  xgFor: number;
  xgAgainst: number;
  momentum: number;
  matchesPlayed: number;
  eloDynamic: number;
  updatedAt: string;
}

export function getForms(): Record<string, PersistedForm> {
  return readJson<Record<string, PersistedForm>>(FORMS_FILE, {});
}

export function saveForm(form: PersistedForm): void {
  const forms = getForms();
  forms[form.teamId] = form;
  writeJson(FORMS_FILE, forms);
}

// ═══════════════════════════════════════════════════════════════
// PREDICTIONS
// ═══════════════════════════════════════════════════════════════

export interface PersistedPrediction {
  matchId: string;
  homeWin: number;
  draw: number;
  awayWin: number;
  mostLikelyScore: string;
  expectedGoalsHome: number;
  expectedGoalsAway: number;
  over25Probability: number;
  bttsProbability: number;
  confidence: string;
  dataQualityScore: number;
  modelVersion: string;
  topScores: { home: number; away: number; probability: number }[];
  // New fields for model disagreement
  agreement?: {
    homeWinStdDev: number;
    drawStdDev: number;
    awayWinStdDev: number;
    agreementScore: number;
    unanimousWinner: boolean;
  };
  uncertainty?: {
    homeWin90: { low: number; high: number };
    draw90: { low: number; high: number };
    awayWin90: { low: number; high: number };
    entropy: number;
    effectiveOutcomes: number;
  };
  models?: {
    dixonColes?: { homeWin: number; draw: number; awayWin: number };
    eloPoisson?: { homeWin: number; draw: number; awayWin: number };
    bayesian?: { homeWin: number; draw: number; awayWin: number };
    purePoisson?: { homeWin: number; draw: number; awayWin: number };
  };
  confidenceScore?: number;
}

export function getPredictions(): Record<string, PersistedPrediction> {
  return readJson<Record<string, PersistedPrediction>>(PREDICTIONS_FILE, {});
}

export function savePrediction(pred: PersistedPrediction): void {
  const preds = getPredictions();
  preds[pred.matchId] = pred;
  writeJson(PREDICTIONS_FILE, preds);
}

export function clearPredictions(): void {
  writeJson(PREDICTIONS_FILE, {});
}

// ═══════════════════════════════════════════════════════════════
// TOURNAMENT PROBABILITIES (champion probs)
// ═══════════════════════════════════════════════════════════════

const TOURNAMENT_PROBS_FILE = path.join(DATA_DIR, 'tournament-probs.json');

export interface PersistedTournamentProb {
  teamId: string;
  championProb: number;
  semifinalistProb?: number;
  runnerUpProb?: number;
  simulationsCount: number;
  totalSimulations: number;
}

export function getTournamentProbs(): PersistedTournamentProb[] {
  return readJson<PersistedTournamentProb[]>(TOURNAMENT_PROBS_FILE, []);
}

export function saveTournamentProbs(probs: PersistedTournamentProb[]): void {
  writeJson(TOURNAMENT_PROBS_FILE, probs);
}

// ═══════════════════════════════════════════════════════════════
// CONSENSUS BRACKET
// ═══════════════════════════════════════════════════════════════

const BRACKET_FILE = path.join(DATA_DIR, 'consensus-bracket.json');

export function getConsensusBracket(): unknown | null {
  return readJson<unknown | null>(BRACKET_FILE, null);
}

export function saveConsensusBracket(bracket: unknown): void {
  writeJson(BRACKET_FILE, bracket);
}

// ═══════════════════════════════════════════════════════════════
// KEY-VALUE STORE (generic)
// ═══════════════════════════════════════════════════════════════

const KV_FILE = path.join(DATA_DIR, 'kv-store.json');

export function getKV(key: string): unknown | null {
  const store = readJson<Record<string, unknown>>(KV_FILE, {});
  return store[key] ?? null;
}

export function setKV(key: string, value: unknown): void {
  const store = readJson<Record<string, unknown>>(KV_FILE, {});
  store[key] = value;
  writeJson(KV_FILE, store);
}
