// FORCH.i ORACLE — File-based persistence store
// Persists match results, team forms, and predictions to JSON files.
// Works in Vercel serverless (writes to /tmp) and local dev (writes to data/).
//
// ATOMICITY: All writes use temp-file-then-rename to prevent partial/corrupt
// files on crash. A simple in-memory cache avoids re-reading on every save.
// In Vercel serverless (ephemeral /tmp, multiple instances) this is "best
// effort" — lambdas don't share /tmp, so each cold start reads fresh.

import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.NODE_ENV === 'production' ? '/tmp/forchi-oracle' : path.join(process.cwd(), '.forchi-data');
const RESULTS_FILE = path.join(DATA_DIR, 'results.json');
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'predictions.json');

// In-memory cache: keyed by file path, stores parsed data + serialized bytes.
// Avoids re-reading the same file multiple times within a single request.
const cache = new Map<string, { data: unknown; json: string }>();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Read JSON file with in-memory cache (busts on write). */
function readJson<T>(filePath: string, fallback: T): T {
  const cached = cache.get(filePath);
  if (cached) return cached.data as T;
  try {
    ensureDir();
    if (fs.existsSync(filePath)) {
      const json = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(json);
      cache.set(filePath, { data, json });
      return data as T;
    }
  } catch { /* ignore */ }
  return fallback;
}

/**
 * Atomically write JSON: write to a temp file, then rename over target.
 * On crash during write, the temp file is lost but the original is intact.
 * Also updates in-memory cache so subsequent reads in the same request are fresh.
 */
function writeJson<T>(filePath: string, data: T): void {
  try {
    ensureDir();
    const json = JSON.stringify(data, null, 2);
    const tmpPath = filePath + '.tmp.' + Date.now();
    fs.writeFileSync(tmpPath, json, 'utf-8');
    fs.renameSync(tmpPath, filePath);
    cache.set(filePath, { data, json });
  } catch { /* ignore in serverless if read-only */ }
}

/** Clear in-memory cache (used between requests or after external mutations). */
export function clearCache(): void {
  cache.clear();
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
  // Validate: scores must be numbers, not null
  if (result.homeScore == null || result.awayScore == null) {
    console.warn(`[file-store] Skipping result for ${result.matchId}: null scores`);
    return;
  }
  const results = getResults();
  const existing = results.findIndex(r => r.matchId === result.matchId);
  if (existing >= 0) {
    // Update existing result with new data (overwrite)
    results[existing] = result;
  } else {
    results.push(result);
  }
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
// ACCURACY METRICS (persisted to survive Vercel cold starts)
// ═══════════════════════════════════════════════════════════════

const ACCURACY_FILE = path.join(DATA_DIR, 'accuracy.json');

export function getAccuracyMetricsFile(): Record<string, {
  matchId: string;
  predictedHomeWin: number;
  predictedDraw: number;
  predictedAwayWin: number;
  actualResult: 'home' | 'draw' | 'away';
  predictedCorrect: boolean;
  brierScore: number;
  logLoss: number;
  modelVersion: string;
  evaluatedAt: string;
}> {
  return readJson(ACCURACY_FILE, {});
}

export function saveAccuracyMetricFile(metric: {
  matchId: string;
  predictedHomeWin: number;
  predictedDraw: number;
  predictedAwayWin: number;
  actualResult: 'home' | 'draw' | 'away';
  predictedCorrect: boolean;
  brierScore: number;
  logLoss: number;
  modelVersion: string;
  evaluatedAt: string;
}): void {
  const metrics = getAccuracyMetricsFile();
  metrics[metric.matchId] = metric;
  writeJson(ACCURACY_FILE, metrics);
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
