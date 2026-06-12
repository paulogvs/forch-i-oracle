---
name: swr-zustand-autosync-closed-loop
description: Closed-loop frontend architecture combining SWR for data fetching, Zustand for shared state, and a heartbeat endpoint for auto-revalidation
source: auto-skill
extracted_at: '2026-06-12T14:46:15.894Z'
---

## Problem
A dashboard app needs to show real-time data from API routes, but:
- Serverless backends are stateless (no WebSockets/SSE easily)
- Polling every endpoint is wasteful
- Multiple pages need to share state (is data live? when was it last updated?)
- Tabs in background shouldn't waste CPU polling

## Solution: SWR + Zustand + heartbeat pattern

### Architecture

```
┌─────────────────────────────────────────────────┐
│  Frontend (React/Next.js)                        │
│                                                   │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐ │
│  │ SWR Hooks│◄──►│ Zustand  │◄──►│ AutoSync   │ │
│  │ (data)   │    │ (state)  │    │ (polling)  │ │
│  └────┬─────┘    └──────────┘    └─────┬──────┘ │
│       │                                 │        │
│       ▼                                 ▼        │
│  API Routes                      /heartbeat      │
└───────┼──────────────────────────────┼───────────┘
        │                              │
        ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│ /api/fixture     │          │ /api/heartbeat    │
│ /api/accuracy    │          │ (lightweight GET) │
│ /api/live-scores │          │ returns changed?  │
└──────────────────┘          └──────────────────┘
```

### 1. Generic SWR hooks (`lib/swr/hooks.ts`)

```ts
'use client';
import useSWR from 'swr';
import { jsonFetcher, postFetcher } from './fetchers';

export const SWR_KEYS = {
  fixture:    '/api/fixture',
  accuracy:   '/api/accuracy',
  liveScores: '/api/live-scores',
} as const;

export function useFixture<T = unknown>() {
  return useSWR<T>(SWR_KEYS.fixture, (k) => postFetcher(k, {}), {
    refreshInterval: 5 * 60 * 1000,   // 5 min
    revalidateOnFocus: true,
    dedupingInterval: 30 * 1000,
    refreshWhenHidden: false,          // pauses when tab inactive
  });
}

export function useLiveScores<T = unknown>(active = true) {
  return useSWR<T>(active ? SWR_KEYS.liveScores : null, jsonFetcher, {
    refreshInterval: active ? 30 * 1000 : 0,  // 30s when live
    refreshWhenHidden: false,
  });
}
```

Key: hooks are **generic** (`<T>`) so consumers get typed data without `any`.

### 2. Zustand shared state (`lib/store/tournament-store.ts`)

```ts
'use client';
import { create } from 'zustand';

interface TournamentState {
  lastUpdated: string | null;
  isLive: boolean;
  refreshKey: number;
  setLastUpdated: (iso: string) => void;
  setLive: (v: boolean) => void;
  bumpRefresh: () => void;
}

export const useTournamentStore = create<TournamentState>((set) => ({
  lastUpdated: null,
  isLive: false,
  refreshKey: 0,
  setLastUpdated: (iso) => set({ lastUpdated: iso }),
  setLive: (v) => set({ isLive: v }),
  bumpRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
}));
```

This state is shared across all pages — the TopBar shows `lastUpdated`, any page can set `isLive`.

### 3. Lightweight heartbeat endpoint (`app/api/system/heartbeat/route.ts`)

```ts
import { NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';

export async function GET() {
  const db = getDataLayer();
  const status = await db.getCronStatus('ingest').catch(() => null);
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    lastIngest: status?.lastRun ?? null,
    changed: Boolean(status?.lastRun),
  });
}
```

Returns **only metadata** — not the actual data. Cheap to poll every 60s.

### 4. AutoSync background component (`components/system/AutoSync.tsx`)

```tsx
'use client';
import { useEffect } from 'react';
import { mutate } from 'swr';
import { useTournamentStore } from '@/lib/store/tournament-store';

export function AutoSync() {
  const { setLastUpdated } = useTournamentStore();

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch('/api/system/heartbeat', { cache: 'no-store' });
        if (cancelled) return;
        const data = await res.json();
        if (data.changed) {
          await Promise.all([
            mutate('/api/fixture'),
            mutate('/api/accuracy'),
            mutate('/api/simulate-tournament'),
          ]);
          setLastUpdated(data.timestamp);
        }
      } catch { /* silently retry next poll */ }
    }
    const id = setInterval(poll, 60_000);
    poll();
    return () => { cancelled = true; clearInterval(id); };
  }, [setLastUpdated]);

  return null;  // renders nothing, just runs side effects
}
```

Mount `<AutoSync />` once in the root layout or AppShell.

### 5. Consume in pages

```tsx
'use client';
import { useAccuracy, useFixture, useLiveScores } from '@/lib/swr/hooks';
import { useTournamentStore } from '@/lib/store/tournament-store';

interface AccuracyResponse {
  winnerAccuracy?: number;
  goalMAE?: number;
}

export default function DashboardPage() {
  const { data, isLoading, error } = useAccuracy<AccuracyResponse>();
  const { setLastUpdated, setLive } = useTournamentStore();

  // Update shared state when data arrives
  useEffect(() => {
    if (data) setLastUpdated(new Date().toISOString());
  }, [data, setLastUpdated]);

  if (isLoading) return <SkeletonCard />;
  if (error) return <EmptyState title="Error al cargar" />;

  return <MetricCard value={data.winnerAccuracy} />;
}
```

### Why this pattern

| Concern | Solution |
|---------|----------|
| Type safety | Generic `<T>` on SWR hooks |
| Shared state | Zustand (single source of truth) |
| Auto-refresh | SWR `refreshInterval` + `refreshWhenHidden: false` |
| Detect backend changes | `/heartbeat` endpoint (cheap poll) |
| No wasted CPU | `refreshWhenHidden: false` pauses background tabs |
| Error visibility | SWR `error` propagated to toast/EmptyState |
| Manual refresh | `mutate(key)` from TopBar button |
| Deduping | `dedupingInterval: 30s` prevents double-fetches |

### When to adapt

- **Real-time data**: Decrease `refreshInterval` (e.g., 10s for live scores)
- **Static data**: Set `refreshInterval: 0` (no auto-refresh)
- **Conditional polling**: Pass `active` flag (e.g., `useLiveScores(isLive)`)
- **SSE/WebSocket available**: Replace heartbeat with event-driven revalidation
