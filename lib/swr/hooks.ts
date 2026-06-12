'use client';
import useSWR from 'swr';
import { jsonFetcher, postFetcher } from './fetchers';

export const SWR_KEYS = {
  fixture:    '/api/fixture',
  accuracy:   '/api/accuracy',
  simulation: '/api/simulate-tournament',
  liveScores: '/api/live-scores',
} as const;

const REFRESH_INTERVALS = {
  staticData: 0,
  semiStatic: 5 * 60 * 1000,
  live:       30 * 1000,
};

export function useFixture<T = unknown>() {
  return useSWR<T>(SWR_KEYS.fixture, (k) => postFetcher(k, {}), {
    refreshInterval: REFRESH_INTERVALS.semiStatic,
    revalidateOnFocus: true,
    dedupingInterval: 30 * 1000,
    refreshWhenHidden: false,
  });
}

export function useAccuracy<T = unknown>() {
  return useSWR<T>(SWR_KEYS.accuracy, jsonFetcher, {
    refreshInterval: REFRESH_INTERVALS.semiStatic,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
  });
}

export function useSimulation<T = unknown>() {
  return useSWR<T>(SWR_KEYS.simulation, jsonFetcher, {
    refreshInterval: REFRESH_INTERVALS.semiStatic,
    revalidateOnFocus: false,
    refreshWhenHidden: false,
  });
}

export function useLiveScores<T = unknown>(active = true) {
  return useSWR<T>(active ? SWR_KEYS.liveScores : null, jsonFetcher, {
    refreshInterval: active ? REFRESH_INTERVALS.live : 0,
    revalidateOnFocus: true,
    refreshWhenHidden: false,
  });
}
