// FORCH.i ORACLE — Server-side prediction cache (in-memory)
// Avoids re-querying Groq for the same match within a time window

import type { Prediction } from './groq';

interface CacheEntry {
  prediction: Prediction;
  timestamp: number;
  expiresAt: number;
}

const CACHE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours — aggressive caching to save API calls
const cache = new Map<string, CacheEntry>();

function makeCacheKey(homeTeam: string, awayTeam: string): string {
  // Order doesn't matter — same teams = same key
  const sorted = [homeTeam.toLowerCase(), awayTeam.toLowerCase()].sort();
  return sorted.join('||');
}

export function getCachedPrediction(
  homeTeam: string,
  awayTeam: string
): Prediction | null {
  const key = makeCacheKey(homeTeam, awayTeam);
  const entry = cache.get(key);

  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.prediction;
}

export function setCachedPrediction(
  homeTeam: string,
  awayTeam: string,
  prediction: Prediction
): void {
  const key = makeCacheKey(homeTeam, awayTeam);
  const now = Date.now();

  cache.set(key, {
    prediction,
    timestamp: now,
    expiresAt: now + CACHE_WINDOW_MS,
  });
}

export function clearCache(): void {
  cache.clear();
}
