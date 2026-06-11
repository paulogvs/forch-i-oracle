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
│   - Is SDK installed? (eval('require').resolve)     │
│        ↓                                            │
│   Yes → dynamic require('./supabase')               │
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
  upsertTeam(team: Omit<DBTeam, 'createdAt' | 'updatedAt'>): Promise<DBTeam>;

  // Matches
  getMatch(id: string): Promise<DBMatch | null>;
  getUpcomingMatches(): Promise<DBMatch[]>;
  updateMatch(id: string, updates: Partial<DBMatch>): Promise<DBMatch>;

  // Predictions
  getPrediction(matchId: string): Promise<DBMatchPrediction | null>;
  savePrediction(pred: Omit<DBMatchPrediction, 'id' | 'predictedAt'>): Promise<DBMatchPrediction>;

  // Team form
  getTeamForm(teamId: string): Promise<DBTeamForm | null>;
  saveTeamForm(form: Omit<DBTeamForm, 'id' | 'updatedAt'>): Promise<DBTeamForm>;

  // Tournament probs
  getTournamentProbs(): Promise<DBTournamentProbs[]>;
  saveTournamentProbs(probs: DBTournamentProb[]): Promise<DBTournamentProbs[]>;

  // Match results
  submitMatchResult(input: RealMatchResultInput): Promise<void>;
  getMatchResults(): Promise<RealMatchResultInput[]>;
  clearMatchResults(): Promise<void>;

  // Cron status
  updateCronStatus(status: CronJobStatus): Promise<void>;
  getCronStatus(jobName: string): Promise<CronJobStatus | null>;

  // Bulk
  seedTeams(teams: DBTeam[]): Promise<void>;
  seedMatches(matches: DBMatch[]): Promise<void>;
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

**Important for ES5 targets**: Use `Array.from(map.values())` instead of `for...of map.values()` to avoid `--downlevelIteration` errors.

## Step 3: Database Implementation (Lazy-Loaded)

```ts
// lib/data-layer/supabase.ts
// CRITICAL: Do NOT import @supabase/supabase-js at the top level.
// Use require() inside functions so webpack doesn't analyze it.

let supabase: unknown = null;

function getClient() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(url, key);
  return supabase;
}

async function getTeam(id: string): Promise<DBTeam | null> {
  const client = getClient();
  if (!client) return null;
  const { data, error } = await client.from('teams').select('*').eq('id', id).single();
  if (error || !data) return null;
  return mapTeamRow(data);
}

// ... implement all methods
```

## Step 4: Factory with Dynamic Loading

```ts
// lib/data-layer/index.ts
import type { IDataLayer } from './interface';
import { inMemoryDataLayer } from './in-memory';

let dataLayerInstance: IDataLayer | null = null;

export function getDataLayer(): IDataLayer {
  if (dataLayerInstance) return dataLayerInstance;
  // Sync version always returns in-memory (safe at build time)
  dataLayerInstance = inMemoryDataLayer;
  return dataLayerInstance;
}

export async function getDataLayerAsync(): Promise<IDataLayer> {
  if (dataLayerInstance) return dataLayerInstance;

  const hasEnv = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

  if (hasEnv) {
    try {
      // Runtime-only SDK check — webpack cannot statically analyze eval('require')
      let sdkAvailable = false;
      try {
        // eslint-disable-next-line no-eval
        const _require = eval('require');
        if (_require) {
          _require.resolve('@supabase/supabase-js');
          sdkAvailable = true;
        }
      } catch { sdkAvailable = false; }

      if (sdkAvailable) {
        // eslint-disable-next-line no-eval
        const _require = eval('require');
        const { supabaseDataLayer } = _require('./supabase');
        dataLayerInstance = supabaseDataLayer as IDataLayer;
      } else {
        dataLayerInstance = inMemoryDataLayer;
      }
    } catch {
      dataLayerInstance = inMemoryDataLayer;
    }
  } else {
    dataLayerInstance = inMemoryDataLayer;
  }

  return dataLayerInstance;
}
```

## Why eval('require')?

Webpack performs **static analysis** on `require()` and `import()` calls. Even inside a conditional, it tries to resolve the module at build time:

```ts
// ❌ FAILS — webpack sees this at build time
if (hasEnv) { const { x } = require('@supabase/supabase-js'); }

// ✅ WORKS — eval prevents static analysis
if (hasEnv) { const _require = eval('require'); const { x } = _require('@supabase/supabase-js'); }
```

## Alternative: Dynamic import with webpackIgnore

```ts
// Also works, creates a separate chunk
const mod = await import(/* webpackIgnore: true */ './supabase');
```

But this still requires the file to exist and be parseable. `eval('require')` is the most flexible for truly optional dependencies.

## Usage in API Routes

```ts
import { getDataLayer } from '@/lib/data-layer';

export async function POST(req: NextRequest) {
  const db = getDataLayer();  // Always works — falls back to in-memory

  // For Supabase support (async):
  // const db = await getDataLayerAsync();

  const teams = await db.getAllTeams();
  const pred = await db.getPrediction(matchId);
  // ...
}
```

## Seed Script (Separate from Next.js Build)

```ts
// scripts/seed-supabase.ts
// Exclude from tsconfig.json to avoid Next.js build:
// "exclude": ["node_modules", "scripts"]

import { createClient } from '@supabase/supabase-js';

async function seed() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await supabase
    .from('teams')
    .upsert(WORLD_CUP_TEAMS.map(t => ({
      id: t.name, fifa_code: t.code, name: t.name,
      group_char: t.group, elo_rating: ELO_RATINGS[t.name] ?? 1500,
    })), { onConflict: 'id' });
}
```

## Vercel Cron Integration

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/ingest?secret=${CRON_SECRET}", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/recalculate?secret=${CRON_SECRET}", "schedule": "0 */12 * * *" }
  ],
  "functions": {
    "app/api/cron/*/route.ts": { "maxDuration": 120, "memory": 1024 }
  }
}
```

## Key Decisions

| Decision | Why |
|----------|-----|
| Interface first | All implementations satisfy the same contract |
| In-memory auto-seeds | App works immediately without setup |
| eval('require') | Prevents webpack build-time analysis |
| Separate seed script | Excluded from tsconfig, can import SDK directly |
| Service role key | API routes need write access (bypasses RLS) |
| onConflict upsert | Idempotent operations for cron re-runs |

## Gotchas

| Issue | Solution |
|-------|----------|
| `for...of Map.values()` with ES5 | Use `Array.from(map.values())` with index loop |
| `import` in data-layer/types.ts | Use relative paths (`../groq` not `./groq`) |
| Function declarations in blocks (ES5) | Use arrow functions: `const fn = async () => {}` |
| Build analyzes supabase.ts | Use `eval('require')` in factory, never import directly |
| Missing type MatchRound | Import from types.ts, not from local module |
| Unused imports in types.ts | Remove them — they cause build errors even if types exist |
