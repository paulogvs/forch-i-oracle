---
name: pluggable-data-layer
description: Build a pluggable data layer for Next.js that auto-selects between in-memory and database (Supabase) using interface-based abstraction and dynamic SDK loading to avoid build errors when the DB SDK is optional
source: auto-skill
extracted_at: '2026-06-11T02:02:40.499Z'
---

# Pluggable Data Layer Pattern for Next.js

When you need a database-backed data layer but want the app to work without it (for development, demos, or when the SDK isn't installed), use an **interface-based abstraction** with **runtime dynamic loading**.

## The Problem

You want your app to work in two modes:
1. **Without database**: In-memory store, auto-seeded from static data
2. **With database**: Supabase/PostgreSQL for persistence and cron jobs

The challenge: **webpack/Next.js analyzes all imports at build time**. A direct `import { createClient } from '@supabase/supabase-js'` will fail the build if the package isn't installed, even if it's behind a conditional.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   API Route                          │
│                                                     │
│   getDataLayer() → IDataLayer interface             │
│        ↓                                            │
│   Factory checks:                                   │
│   - Are env vars set? (SUPABASE_URL, SUPABASE_KEY)  │
│   - Is SDK installed? (dynamic import)              │
│        ↓                                            │
│   Yes → dynamic import('./supabase')               │
│   No  → return inMemoryDataLayer                    │
└─────────────────────────────────────────────────────┘
```

## Step 1: Define the Interface

```ts
// lib/data-layer/interface.ts
export interface IDataLayer {
  // Teams
  getTeam(id: string): Promise<DBTeam | null>;
  getAllTeams(): Promise<DBTeam[]>;

  // Matches
  getMatch(id: string): Promise<DBMatch | null>;
  getUpcomingMatches(): Promise<DBMatch[]>;
  getAllMatches(): Promise<DBMatch[]>;

  // Predictions
  getPrediction(matchId: string): Promise<DBMatchPrediction | null>;
  savePrediction(pred: Omit<DBMatchPrediction, 'id' | 'predictedAt'>): Promise<DBMatchPrediction>;
  getPredictionsForMatches(matchIds: string[]): Promise<DBMatchPrediction[]>;

  // Team form
  getTeamForm(teamId: string): Promise<DBTeamForm | null>;
  saveTeamForm(form: Omit<DBTeamForm, 'id' | 'updatedAt'>): Promise<DBTeamForm>;

  // Match results
  submitMatchResult(input: RealMatchResultInput): Promise<void>;

  // Cron status
  getCronStatus(jobName: string): Promise<CronJobStatus | null>;
}
```

## Step 2: In-Memory Implementation (Default)

```ts
// lib/data-layer/in-memory.ts
const teamsStore = new Map<string, DBTeam>();
let initialized = false;

function ensureInitialized(): void {
  if (initialized) return;
  // Auto-seed from static data files
  for (const t of WORLD_CUP_TEAMS) {
    teamsStore.set(t.name, { ...t, createdAt: now(), updatedAt: now() });
  }
  initialized = true;
}

export const inMemoryDataLayer: IDataLayer = {
  async getTeam(id) { ensureInitialized(); return teamsStore.get(id) ?? null; },
  async getAllTeams() { ensureInitialized(); return Array.from(teamsStore.values()); },
  // ... implement all methods
};
```

## Step 3: Database Implementation (Lazy-Loaded)

```ts
// lib/data-layer/supabase.ts
// CRITICAL: Do NOT import @supabase/supabase-js at the top level.
// Use require() inside functions so webpack doesn't analyze it.

let supabase: any = null;

function getClient() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  // @ts-ignore — @supabase/supabase-js is in package.json, tsc may not resolve require()
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(url, key);
  return supabase;
}
```

## Step 4: Factory with Dynamic Loading

```ts
// lib/data-layer/index.ts
import type { IDataLayer } from './interface';

let dataLayerInstance: IDataLayer | null = null;

export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;
  await initAsync();
  return dataLayerInstance!;
}

async function initAsync(): Promise<void> {
  if (dataLayerInstance) return;

  const hasEnv = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

  if (hasEnv) {
    try {
      // @ts-ignore — supabase.ts uses require('@supabase/supabase-js')
      const { supabaseDataLayer } = await import('./supabase');
      dataLayerInstance = supabaseDataLayer as IDataLayer;
      return;
    } catch (err) {
      console.warn('[data-layer] Failed to load Supabase:', err);
    }
  }

  // Fallback: in-memory (always works)
  const { inMemoryDataLayer } = await import('./in-memory');
  dataLayerInstance = inMemoryDataLayer;
}
```

## Step 5: tsconfig.json — Exclude supabase.ts

```json
{
  "exclude": ["node_modules", "scripts", "lib/data-layer/supabase.ts"]
}
```

**Why:** `supabase.ts` uses `require('@supabase/supabase-js')` which TypeScript can't resolve statically. Excluding it prevents `tsc --noEmit` from failing while keeping the file available for runtime dynamic import.

## Step 6: package.json — SDK in dependencies

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.108.1"
  }
}
```

**Why:** `@supabase/supabase-js` must be in `dependencies`, NOT `optionalDependencies`. Vercel does NOT reliably install optionalDependencies during build, causing `tsc --noEmit` to fail with `Cannot find module '@supabase/supabase-js'`.

## Key Decisions

| Decision | Why |
|----------|-----|
| Interface first | All implementations satisfy the same contract |
| In-memory auto-seeds | App works immediately without setup |
| `require()` in supabase.ts | Prevents webpack build-time analysis |
| `@ts-ignore` on dynamic import | tsc can't statically resolve the require() chain |
| Exclude supabase.ts from tsconfig | Prevents `tsc --noEmit` from analyzing the file |
| SDK in `dependencies` (not `optionalDependencies`) | Vercel always installs dependencies during build |
| Separate seed script | Excluded from tsconfig, can import SDK directly |

## Gotchas

| Issue | Solution |
|-------|----------|
| `for...of Map.values()` with ES5 | Use `Array.from(map.values())` with index loop |
| Function declarations in blocks (ES5) | Use arrow functions: `const fn = async () => {}` |
| `await import('@supabase/...')` in factory | Fails tsc — use `await import('./supabase')` instead |
| `@supabase/supabase-js` in `optionalDependencies` | Vercel won't install it — move to `dependencies` |
| `tsc --noEmit` fails on supabase.ts | Exclude from tsconfig + `@ts-ignore` on require() |
| Data layer returns `null` in prod | Never throw — always fallback to in-memory |
| `getCronStatus` requires jobName argument | Always pass string like `'ingest'`, `'recalculate'`, `'simulate'` |
