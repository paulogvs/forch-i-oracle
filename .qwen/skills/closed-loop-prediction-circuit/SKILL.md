---
name: closed-loop-prediction-circuit
description: Build a self-updating prediction system where real results automatically trigger re-simulation, updated predictions, and drift tracking — with file persistence for serverless environments
source: auto-skill
extracted_at: '2026-06-12T00:35:00.000Z'
---

## Closed-Loop Prediction Circuit

A circular data flow where real-world results automatically improve future predictions without any manual intervention.

### Critical: File Persistence for Serverless

**In Vercel serverless, each API call is a new process — in-memory data is lost between requests.**

Without file persistence, the closed loop breaks:
```
Request 1: Save MEX 2-0 RSA → Memory ✅
Request 2: Read results → New process → Memory empty ❌
```

**Solution:** Use a JSON file store alongside in-memory:

```typescript
// lib/file-store.ts
import fs from 'fs';
const DATA_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/forchi-oracle'  // Vercel serverless writable dir
  : path.join(process.cwd(), '.forchi-data');  // Local dev

export function saveResult(result: PersistedResult) {
  const results = readJson(RESULTS_FILE, []);
  if (!results.find(r => r.matchId === result.matchId)) {
    results.push(result);
    writeJson(RESULTS_FILE, results);
  }
}

export function getResults(): PersistedResult[] {
  return readJson(RESULTS_FILE, []);
}
```

In the data layer, persist on every save:
```typescript
// lib/data-layer/in-memory.ts
async function submitMatchResult(input: RealMatchResultInput) {
  matchResultsStore.push(input);  // In-memory (fast access)
  saveFileResult({...input, submittedAt: new Date().toISOString()});  // File (persistence)
}

async function getMatchResults() {
  // Merge in-memory + file results
  const fileResults = getFileResults();
  const fileIds = new Set(matchResultsStore.map(r => r.matchId));
  return [...matchResultsStore, ...fileResults.filter(f => !fileIds.has(f.matchId))];
}
```

### Architecture

```
┌─────────────────────────────────────────────┐
│           CIRCUITO CERRADO AUTOMÁTICO        │
│                                              │
│  ┌──────────────┐                            │
│  │  API-Football│   Every 6-12 hours         │
│  │  (league ID) │──┐                          │
│  └──────────────┘  │                          │
│                    ▼                          │
│  ┌────────────────────────────┐               │
│  │  Cron Ingest (GitHub Actions)│              │
│  │  1. Scrape finished results │               │
│  │  2. Save to file store      │ ←─ PERSISTENCE
│  │  3. Update team form/Elo    │               │
│  │  4. Re-simulate full bracket│               │
│  └────────────────────────────┘               │
│                    │                          │
│                    ▼                          │
│  ┌────────────────────────────┐               │
│  │  Live Panel (auto-updated) │               │
│  │  • Real vs Predicted       │               │
│  │  • Live standings          │               │
│  │  • Live bracket            │               │
│  │  • Accuracy stats          │               │
│  └────────────────────────────┘               │
└─────────────────────────────────────────────┘
```

### Key Implementation Pattern

**1. Prediction History (`lib/prediction-history.ts`)**

```typescript
export interface PredictionDrift {
  matchId: string;
  original: { homeGoals: number; awayGoals: number; homeWinPct: number };
  current:  { homeGoals: number; awayGoals: number; homeWinPct: number };
  goalDrift: number;           // |current - original| in goals
  confidenceDrift: number;     // percentage points change
  direction: 'up' | 'down' | 'same';
  updatedAt: string;
}

export async function recalculateAfterResult(
  matchId: string, homeScore: number, awayScore: number
): Promise<{ drifts: PredictionDrift[]; bracket: any; top8: any[] }> {
  // 1. Save snapshot of current predictions
  // 2. Record real result in data layer
  // 3. Re-simulate entire tournament with real results baked in
  // 4. Calculate drift for each future match
  // 5. Update predictions with new values
}
```

**2. Auto-Recalculate in Cron Ingest**

After ingesting new results, the cron job triggers full re-simulation:

```typescript
// In /api/cron/ingest/route.ts
if (results.resultsIngested > 0) {
  const allResults = await db.getMatchResults();
  for (const r of allResults) {
    await recalculateAfterResult(r.matchId, r.homeScore, r.awayScore);
  }
}
```

**3. Live Update Endpoint**

```typescript
// POST /api/live-update
// Receives result → re-simulates → returns drift data
export async function POST(request: NextRequest) {
  const { matchId, homeScore, awayScore } = await request.json();
  const result = await recalculateAfterResult(matchId, homeScore, awayScore);
  const liveStandings = await getLiveStandings();
  return NextResponse.json({ drifts: result.drifts, liveStandings, bracket: result.bracket });
}
```

### Drift Display Pattern

Show how predictions changed after each result:

```
Final: Brasil vs Argentina
├── Original: Brasil 1-0 (45%)
├── After Groups: Brasil 2-1 (52%) ⬆ +7%
├── After R16:    Brasil 1-1 (48%) ⬇ -4%
└── Now:          Brasil 2-0 (61%) ⬆ +13% 🔥
```

### No Manual Input

The system has ZERO manual entry forms. All data flows automatically:
- Real results come from API-Football via cron ingest
- Predictions update automatically after each result
- User only views — never inputs

### Cron Job Strategy

| Frequency | Cost | Purpose |
|---|---|---|
| Every 12h | ~360 min/month | Standard auto-update |
| Manual button | 0 min (on-demand) | User-triggered after important matches |
| GitHub Actions public repo | 2,000 min/month | Free tier |

### Data Layer Requirements

The data layer must support:
- `submitMatchResult()` — store real results
- `getMatchResults()` — retrieve all real results
- `getUpcomingMatches()` — matches not yet played
- `deletePrediction()` / `savePrediction()` — update stale predictions
- `getTeamForm()` / `saveTeamForm()` — dynamic team form tracking
- `updateCronStatus()` — track job execution

### When to Use

- Sports prediction apps that improve over time
- Any forecasting system with observable ground truth
- Systems where users need to see prediction quality metrics
- Tournament/bracket prediction with progressive results
