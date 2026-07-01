'use client';
import useSWR from 'swr';
import { jsonFetcher, postFetcher } from './fetchers';
import { getRefreshInterval } from '@/lib/smart-refresh';

export const SWR_KEYS = {
  fixture:    '/api/fixture',
  accuracy:   '/api/accuracy',
  simulation: '/api/simulate-tournament',
  liveScores: '/api/live-scores',
  predictedBracket: '/api/predicted-bracket',
} as const;

export function useFixture<T = unknown>() {
  return useSWR<T>(SWR_KEYS.fixture, (k) => postFetcher(k, {}), {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 60 * 1000, // 60s dedup — reduces redundant POST calls
    refreshWhenHidden: false,
    onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
      // Never retry on 5xx errors (server overloaded)
      if (err?.message?.startsWith('[5')) return;
      // Retry up to 3 times, with exponential backoff starting at 30s
      if (retryCount >= 3) return;
      setTimeout(() => revalidate({ retryCount }), 30000 * (retryCount + 1));
    },
    keepPreviousData: true, // Show stale data while revalidating
  });
}

export function useAccuracy<T = unknown>() {
  return useSWR<T>(SWR_KEYS.accuracy, jsonFetcher, {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    keepPreviousData: true,
  });
}

export function useSimulation<T = unknown>() {
  return useSWR<T>(SWR_KEYS.simulation, jsonFetcher, {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: false,
    refreshWhenHidden: false,
    keepPreviousData: true,
  });
}

export function useLiveScores<T = unknown>(active = true) {
  return useSWR<T>(active ? SWR_KEYS.liveScores : null, jsonFetcher, {
    refreshInterval: active ? 30 * 1000 : 0,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    keepPreviousData: true,
  });
}

export function usePredictedBracket<T = unknown>() {
  return useSWR<T>(SWR_KEYS.predictedBracket, jsonFetcher, {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
    keepPreviousData: true,
  });
}
