---
name: live-tournament-prediction-pipeline
description: Closed-loop prediction system — real results trigger full bracket re-simulation with drift tracking and auto-updating live dashboard
source: auto-skill
extracted_at: '2026-06-11T19:58:28.551Z'
---

# Closed-Loop Live Tournament Prediction Pipeline

When building a sports prediction app that runs **during** a tournament, you need a **circular** (not linear) pipeline where real results continuously improve future predictions:

```
Resultado Real → Actualiza Datos del Equipo → Re-simula Bracket → Nuevas Predicciones → Usuario ve el cambio
```

## Architecture: The Closed Loop

```
┌─────────────────────────────────────────────────┐
│              CIRCUITO CERRADO                    │
│                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Cron    │───▶│  Ingest  │───▶│  Datos   │   │
│  │  (6h)    │    │  API     │    │  Equipos │   │
│  └──────────┘    └──────────┘    └─────┬────┘   │
│                                        │         │
│  ┌──────────┐    ┌──────────┐    ┌─────▼────┐   │
│  │  Panel 3 │◀───│  Delta   │◀───│  Re-     │   │
│  │  (Vivo)  │    │  History │    │  Simula  │   │
│  └──────────┘    └──────────┘    └──────────┘   │
└─────────────────────────────────────────────────┘
```

## 4-Panel Navigation Structure

The app should have exactly 4 navigable panels:

| Panel | Content |
|---|---|
| **Dashboard** | Model accuracy metrics, hit rate, trend graph |
| **Predicción** | All 128 matches pre-filled with predicted scores |
| **En Vivo** | Real results vs predictions, live standings, live bracket, enter results |
| **Benchmark** | Model comparison testing |

Remove separate `/admin` and `/pronostico` pages — integrate their functionality into the main panels.

## What Happens After Each Real Result

1. **Team Elo dynamically adjusts** (rises if won, falls if lost)
2. **Recent form updates** (last 5 real matches with weighted momentum)
3. **Momentum and xG recalculated** with competition weighting
4. **Entire remaining bracket re-simulated** (100 Monte Carlo simulations via `simulateTournamentMulti`)
5. **Bracket re-structured** with real winners advancing
6. **Prediction drift tracked** — each future match shows how much it changed

## Prediction Drift Tracking

Each future match shows how much the prediction changed since the last update:

```
Final: Brasil vs Argentina
├── Predicción original: Brasil 1-0 (45%)
├── Después de Fase de Grupos: Brasil 2-1 (52%) ⬆ +7%
├── Después de Octavos: Brasil 1-1 (48%) ⬇ -4%
└── Ahora: Brasil 2-0 (61%) ⬆ +13% 🔥
```

### Drift Interface

```ts
interface PredictionDrift {
  matchId: string;
  original: { homeGoals: number; awayGoals: number; homeWinPct: number };
  current: { homeGoals: number; awayGoals: number; homeWinPct: number };
  goalDrift: number;          // |current - original| in goals
  confidenceDrift: number;    // percentage points change
  direction: 'up' | 'down' | 'same';
  updatedAt: string;
}
```

## Key Files

### lib/prediction-history.ts
Core engine for the closed loop:

```ts
// After a real result: save snapshot, re-simulate, calculate drift
export async function recalculateAfterResult(
  playedMatchId: string,
  homeScore: number,
  awayScore: number
): Promise<{ drifts: PredictionDrift[]; bracket: TournamentBracket; top8: ChampionProbability[] }> {
  const db = getDataLayer();

  // 1. Save real result
  await db.submitMatchResult({ matchId: playedMatchId, homeScore, awayScore, winner });

  // 2. Re-simulate entire tournament with ALL real results
  const realResults = await db.getMatchResults();
  const simResults: RealMatchResult[] = realResults.map(r => ({
    matchId: r.matchId, homeScore: r.homeScore, awayScore: r.awayScore, winner: r.winner,
  }));
  const simResult = await simulateTournamentMulti(100, simResults, () => {});

  // 3. Calculate drift for each future match
  const drifts: PredictionDrift[] = [];
  const upcomingMatches = await db.getUpcomingMatches();
  const bracketMatches = [...simResult.bracket.roundOf32, ...simResult.bracket.roundOf16, ...];

  for (const bm of bracketMatches) {
    const futureMatch = upcomingMatches.find(m => m.id === bm.id);
    const origPred = await db.getPrediction(futureMatch.id);
    // Compare original vs new, push drift
  }

  // 4. Update all predictions in data layer
  // 5. Return { drifts, bracket, top8 }
}

// Live standings from real results only
export async function getLiveStandings(): Promise<Record<string, GroupStanding[]>> {
  // Process real results → calculate PJ, PG, PE, PP, GF, GC, DG, Pts → sort
}

// Live knockout bracket from real results
export async function getLiveBracket(): Promise<TournamentBracket | null> {
  const realResults = await db.getMatchResults();
  if (realResults.length === 0) return null;
  return (await simulateTournamentMulti(100, simResults, () => {})).bracket;
}
```

### /api/live-update
Endpoint that receives a result and triggers the full re-simulation:

```ts
// POST /api/live-update
export async function POST(request: NextRequest) {
  const { matchId, homeScore, awayScore } = await request.json();
  const result = await recalculateAfterResult(matchId, homeScore, awayScore);
  const liveStandings = await getLiveStandings();
  return NextResponse.json({
    success: true, drifts: result.drifts, driftCount: result.drifts.length,
    liveStandings, bracket: result.bracket, top8: result.top8,
  });
}
```

### Cron Ingest with Auto-Recalculate

After ingesting real results from API-Football, trigger re-simulation:

```ts
// app/api/cron/ingest/route.ts
import { recalculateAfterResult } from '@/lib/prediction-history';

// After processing fixtures...
if (results.resultsIngested > 0) {
  const allResults = await db.getMatchResults();
  for (const r of allResults) {
    await recalculateAfterResult(r.matchId, r.homeScore, r.awayScore);
  }
}
```

## Panel 3 (En Vivo) Implementation

2 tabs within the panel:

1. **Tabla de Grupos** — Live group standings recalculated from real results (PJ, PG, PE, PP, GF, GC, DG, Pts)
2. **Eliminatorias** — Live knockout bracket advancing with real winners

**NO manual entry form** — all data comes automatically from cron ingest. Include a prominent "🔄 Actualizar" button that calls `loadData()` to refresh all data from the server.

Match display format:
```
[Real: ARG 2 - 1 FRA] ✅ | [Pred: ARG 1 - 1 FRA] | ⬆ +7%
```

The GET `/api/simulate-tournament` endpoint must return `liveStandings` and `liveBracket` alongside results:
```ts
return NextResponse.json({
  success: true, results, total: results.length,
  liveStandings: await getLiveStandings(),
  liveBracket: await getLiveBracket(),
});
```

## Timezone Handling

All match dates/times are stored in UTC. Convert to user's local timezone for display:

```ts
// lib/timezone.ts
export function utcToLocal(dateStr: string, timeStr: string): {
  date: string; time: string; display: string; isDifferentDay: boolean;
}

export const TIMEZONE_PRESETS = [
  { label: 'Bolivia', offset: -4 },
  { label: 'México CDMX', offset: -6 },
  { label: 'EE.UU. Este', offset: -5 },
  // ...
];
```

Auto-detect user timezone on page load, default to Bolivia (UTC-4). Show a selector so users can switch.

## Key Principles

1. **Closed loop, not linear** — Every result feeds back into the model
2. **Auto-recalculate immediately** — Don't wait for cron jobs
3. **Full bracket re-simulation** — Use `simulateTournamentMulti(100, ...)` not single-pass
4. **Drift tracking** — Users see how predictions evolve and gain/lose confidence
5. **Live standings/bracket** — Recalculated from real results, not predictions
6. **Timezone-aware display** — Group matches by local date, not UTC date
7. **4-panel navigation** — Dashboard, Predicción, En Vivo, Benchmark. Remove redundant pages.
