// FORCH.i ORACLE — Server-side caching layer
// Two caches: statistical predictions (2h TTL) + API responses (5 min TTL)

import type { Prediction } from './types/prediction';

// ═══ PREDICTION CACHE (2 hours) ═══
interface PredictionCacheEntry {
  prediction: Prediction;
  timestamp: number;
  expiresAt: number;
}

const PREDICTION_CACHE_WINDOW_MS = 2 * 60 * 60 * 1000;
const predictionCache = new Map<string, PredictionCacheEntry>();

function makePredictionKey(homeTeam: string, awayTeam: string): string {
  const sorted = [homeTeam.toLowerCase(), awayTeam.toLowerCase()].sort();
  return sorted.join('||');
}

export function getCachedPrediction(homeTeam: string, awayTeam: string): Prediction | null {
  const key = makePredictionKey(homeTeam, awayTeam);
  const entry = predictionCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { predictionCache.delete(key); return null; }
  return entry.prediction;
}

export function setCachedPrediction(homeTeam: string, awayTeam: string, prediction: Prediction): void {
  const key = makePredictionKey(homeTeam, awayTeam);
  const now = Date.now();
  predictionCache.set(key, { prediction, timestamp: now, expiresAt: now + PREDICTION_CACHE_WINDOW_MS });
}

// ═══ API RESPONSE CACHE (5 minutes) ═══
interface ApiCacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

const API_CACHE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const apiCache = new Map<string, ApiCacheEntry>();

export function getCachedApiResponse<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { apiCache.delete(key); return null; }
  return entry.data as T;
}

export function setApiResponse<T>(key: string, data: T): void {
  const now = Date.now();
  apiCache.set(key, { data, timestamp: now, expiresAt: now + API_CACHE_WINDOW_MS });
}

export function clearCache(): void {
  predictionCache.clear();
  apiCache.clear();
}
