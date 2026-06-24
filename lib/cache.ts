// FORCH.i ORACLE — Server-side caching layer
// Two caches: Groq predictions (2h) + API responses (5 min)

import type { Prediction } from './types/prediction';

// ═══ GROQ PREDICTION CACHE (2 hours) ═══
interface GroqCacheEntry {
  prediction: Prediction;
  timestamp: number;
  expiresAt: number;
}

const GROQ_CACHE_WINDOW_MS = 2 * 60 * 60 * 1000;
const groqCache = new Map<string, GroqCacheEntry>();

function makeGroqKey(homeTeam: string, awayTeam: string): string {
  const sorted = [homeTeam.toLowerCase(), awayTeam.toLowerCase()].sort();
  return sorted.join('||');
}

export function getCachedPrediction(homeTeam: string, awayTeam: string): Prediction | null {
  const key = makeGroqKey(homeTeam, awayTeam);
  const entry = groqCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { groqCache.delete(key); return null; }
  return entry.prediction;
}

export function setCachedPrediction(homeTeam: string, awayTeam: string, prediction: Prediction): void {
  const key = makeGroqKey(homeTeam, awayTeam);
  const now = Date.now();
  groqCache.set(key, { prediction, timestamp: now, expiresAt: now + GROQ_CACHE_WINDOW_MS });
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
  groqCache.clear();
  apiCache.clear();
}
