'use client';
import useSWR from 'swr';
import { jsonFetcher, postFetcher } from './fetchers';
import { getRefreshInterval } from '@/lib/smart-refresh';

export const SWR_KEYS = {
  fixture:    '/api/fixture',
  accuracy:   '/api/accuracy',
  simulation: '/api/simulate-tournament',
  liveScores: '/api/live-scores',
} as const;

export function useFixture<T = unknown>() {
  return useSWR<T>(SWR_KEYS.fixture, (k) => postFetcher(k, {}), {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 30 * 1000,
    refreshWhenHidden: false,
  });
}

export function useAccuracy<T = unknown>() {
  return useSWR<T>(SWR_KEYS.accuracy, jsonFetcher, {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
  });
}

export function useSimulation<T = unknown>() {
  return useSWR<T>(SWR_KEYS.simulation, jsonFetcher, {
    refreshInterval: getRefreshInterval,
    revalidateOnFocus: false,
    refreshWhenHidden: false,
  });
}

export function useLiveScores<T = unknown>(active = true) {
  return useSWR<T>(active ? SWR_KEYS.liveScores : null, jsonFetcher, {
    refreshInterval: active ? 30 * 1000 : 0,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
  });
}
