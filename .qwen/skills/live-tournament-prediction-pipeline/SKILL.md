---
name: live-tournament-prediction-pipeline
description: Full pipeline for live tournament predictions: ingest real results, auto-recalculate affected matches, and display evolving verdicts in a dashboard
source: auto-skill
extracted_at: '2026-06-11T16:33:01.543Z'
---

# Live Tournament Prediction Pipeline

When building a sports prediction app that runs **during** a tournament (not just pre-tournament), you need a pipeline that:
1. Ingests real match results from APIs or manual entry
2. Auto-recalculates predictions for affected future matches
3. Displays evolving predictions in a live dashboard

## Architecture

```
Real match result → /api/match-result
       ↓
1. Save result to data layer
2. Update team form (momentum, xG, Elo)
3. Find affected future matches
4. Delete stale predictions
5. Recalculate predictions with updated form
6. (Optional) Re-simulate tournament
       ↓
/veredicto — Dashboard shows updated predictions
```

## 1. Match Result Endpoint (Auto-Recalculate)

```ts
// app/api/match-result/route.ts

export async function POST(request: NextRequest) {
  const { matchId, homeTeam, awayTeam, homeScore, awayScore, competition } = await request.json();

  const db = getDataLayer();
  const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'draw';

  // Step 1: Save real result
  await db.submitMatchResult({ matchId, homeScore, awayScore, winner });

  // Step 2: Update team form for both teams
  await updateTeamForm(db, homeTeam, awayTeam, homeScore, awayScore, competition);

  // Step 3: Find future matches involving these teams
  const upcoming = await db.getUpcomingMatches();
  const affected = upcoming.filter(
    m => m.homeTeamId === homeTeam || m.awayTeamId === homeTeam ||
         m.homeTeamId === awayTeam || m.awayTeamId === awayTeam
  );

  // Step 4: Auto-recalculate predictions (not just invalidate)
  let recalculated = 0;
  for (const match of affected) {
    await db.deletePrediction(match.id);

    const homeForm = await db.getTeamForm(match.homeTeamId);
    const awayForm = await db.getTeamForm(match.awayTeamId);

    const enhanced = await calculateEnhancedPrediction(
      match.homeTeamId, match.awayTeamId,
      buildContext(match.homeTeamId, homeForm, match.venue),
      buildContext(match.awayTeamId, awayForm, match.venue),
    );

    await db.savePrediction({
      matchId: match.id,
      homeWin: enhanced.homeWin,
      draw: enhanced.draw,
      awayWin: enhanced.awayWin,
      mostLikelyScore: `${enhanced.predictedScoreHome}-${enhanced.predictedScoreAway}`,
      expectedGoalsHome: enhanced.homeExpectedGoals,
      expectedGoalsAway: enhanced.awayExpectedGoals,
      confidence: enhanced.confidence,
      // ... all other fields
    });
    recalculated++;
  }

  return NextResponse.json({
    success: true,
    predictionsRecalculated: recalculated,
    affectedMatches: affected.map(m => m.id),
  });
}
```

**Key difference from naive approach:** Don't just delete stale predictions — **recalculate them immediately** so the user sees updated numbers right away, not just empty slots waiting for the next cron job.

## 2. Team Form Update Function

```ts
async function updateTeamForm(
  db: IDataLayer,
  homeTeam: string, awayTeam: string,
  homeGoals: number, awayGoals: number,
  competition = 'World Cup'
) {
  const now = new Date().toISOString().split('T')[0];

  for (const [team, goalsFor, goalsAgainst] of [
    [homeTeam, homeGoals, awayGoals],
    [awayTeam, awayGoals, homeGoals],
  ] as [string, number, number][]) {
    const existing = await db.getTeamForm(team);
    const result = goalsFor > goalsAgainst ? 'W' : goalsFor < goalsAgainst ? 'L' : 'D';

    const last5 = [
      ...(existing?.last5 || []),
      { result, opponent: team === homeTeam ? awayTeam : homeTeam,
        goalsFor, goalsAgainst, date: now, competition },
    ].slice(-5);

    const momentum = last5.reduce((sum, m, i) => {
      const weight = (i + 1) / last5.length;  // Recent matches weigh more
      return sum + (m.result === 'W' ? weight : m.result === 'L' ? -weight : 0);
    }, 0) / last5.length;

    const elo = (await db.getTeam(team))?.eloRating || 1500;

    await db.saveTeamForm({
      teamId: team,
      last5,
      xgFor: goalsFor || 0.8,
      xgAgainst: goalsAgainst,
      momentum,
      matchesPlayed: (existing?.matchesPlayed || 0) + 1,
      eloDynamic: elo + (momentum * 20),  // Elo shifts with form
    });
  }
}
```

## 3. World Cup Data Ingestion (Cron Job)

The ingest cron job must fetch **World Cup fixtures** (league ID 9), not club leagues:

```ts
// app/api/cron/ingest/route.ts

// League ID 9 = World Cup
const wcData = await apiFetch('/fixtures?league=9&season=2026');

for (const fixture of wcData?.response || []) {
  // Only process finished matches
  if (fixture.fixture?.status?.short !== 'FT') continue;

  // Map API team names → local Spanish names
  const homeTeam = mapApiNameToSpanish(fixture.teams?.home?.name);
  const awayTeam = mapApiNameToSpanish(fixture.teams?.away?.name);

  const match = await db.getMatchByTeams(homeTeam, awayTeam);
  if (!match) continue;

  // Skip duplicates
  const existing = await db.getMatchResults();
  if (existing.some(r => r.matchId === match.id)) continue;

  await db.submitMatchResult({
    matchId: match.id,
    homeScore: fixture.goals.home,
    awayScore: fixture.goals.away,
    winner: ...,
  });

  await updateTeamForm(db, homeTeam, awayTeam, fixture.goals.home, fixture.goals.away);
}
```

### Team Name Mapping

API-Football uses English names. You need a mapping to your local Spanish names:

```ts
const NAME_ALIASES: Record<string, string> = {
  'Brazil': 'Brasil',
  'USA': 'Estados Unidos',
  'Germany': 'Alemania',
  'Ivory Coast': 'Costa de Marfil',
  'Czech Republic': 'Chequia',
  'South Korea': 'Corea del Sur',
  // ... all 48 teams
};

function mapApiNameToSpanish(apiName: string): string | null {
  if (NAME_ALIASES[apiName]) return NAME_ALIASES[apiName];
  // Fallback: try WORLD_CUP_TEAMS.find(t => t.englishName === apiName)
  return null;
}
```

## 4. Live Verdict Dashboard

```tsx
// app/veredicto/page.tsx

export default function VeredictoPage() {
  const [topTeams, setTopTeams] = useState<TeamPrediction[]>([]);
  const [predictions, setPredictions] = useState<PredictionHistory[]>([]);

  useEffect(() => {
    // Load both predictions and tournament probabilities
    Promise.all([
      fetch('/api/predictions/all'),
      fetch('/api/simulate-tournament'),
    ]).then(([predRes, simRes]) => {
      const predData = await predRes.json();
      const simData = await simRes.json();
      // Merge and display
    });
  }, []);

  return (
    <div>
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Partidos totales" value={totalMatches} />
        <StatCard label="Predicciones" value={totalPredictions} />
        <StatCard label="Equipos rankeados" value={topTeams.length} />
      </div>

      {/* Top 8 Champion Probability */}
      {topTeams.slice(0, 8).map((team, i) => (
        <div key={team.teamId}>
          <span>{getFlag(team.name)}</span>
          <span>{team.name}</span>
          <span className="font-bold">{team.championProb}%</span>
          <ProgressBar value={team.championProb} />
        </div>
      ))}

      {/* Predictions sorted by confidence (most certain first) */}
      {predictions
        .sort((a, b) => Math.max(b.homeWin, b.draw, b.awayWin) - Math.max(a.homeWin, a.draw, a.awayWin))
        .slice(0, 20)
        .map(pred => (
          <PredictionRow key={pred.matchId} pred={pred} />
        ))
      }
    </div>
  );
}
```

## 5. GitHub Actions Cron Jobs

Vercel Hobby only allows 1 cron job/day. Use GitHub Actions for multiple schedules:

```yaml
# .github/workflows/cron-jobs.yml

on:
  schedule:
    - cron: '0 */6 * * *'    # Ingest: every 6h
    - cron: '0 */12 * * *'   # Recalculate: every 12h
    - cron: '0 0 * * *'      # Simulate: daily at midnight UTC
  workflow_dispatch:          # Allow manual trigger

jobs:
  cron-ingest:
    if: github.event.schedule == '0 */6 * * *' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s "${VERCEL_URL}/api/cron/ingest?secret=${CRON_SECRET}"
    env:
      VERCEL_URL: ${{ secrets.VERCEL_URL }}
      CRON_SECRET: ${{ secrets.CRON_SECRET }}
```

**Required GitHub Secrets:**
- `VERCEL_URL` — `https://your-app.vercel.app`
- `CRON_SECRET` — Same value as in Vercel env vars

## 6. Admin Panel — Manual Result Entry

During the tournament, provide a UI for entering results (in case API ingestion fails):

```tsx
// app/admin/page.tsx

// Search/select a match
const filteredMatches = ALL_MATCHES.filter(m =>
  m.homeTeam.toLowerCase().includes(searchTerm) ||
  m.awayTeam.toLowerCase().includes(searchTerm)
);

// Score inputs
<input type="number" min={0} max={20} value={homeScore} />
<span>—</span>
<input type="number" min={0} max={20} value={awayScore} />

// Submit
await fetch('/api/match-result', {
  method: 'POST',
  body: JSON.stringify({ matchId, homeTeam, awayTeam, homeScore, awayScore }),
});
```

## Pipeline Sequence During Tournament

```
Match finishes
    ↓
Admin enters result OR cron job ingests from API
    ↓
/api/match-result:
  1. Save result
  2. Update team form (momentum, xG, Elo)
  3. Delete stale predictions for future matches
  4. Recalculate predictions with updated form
    ↓
User sees updated numbers on /veredicto immediately
    ↓
Every 12h: /api/cron/recalculate recalculates ALL predictions
Every 6h:  /api/cron/ingest fetches new results from API
Daily:     /api/cron/simulate runs 100 tournament sims
```

## Key Principles

1. **Auto-recalculate immediately** — Don't wait for cron jobs. After each result, recalculate affected predictions right away.
2. **Update team form** — Each result should update momentum, xG, and Elo for both teams.
3. **Show evolution** — The verdict dashboard should show current predictions sorted by confidence, not just the original pre-tournament predictions.
4. **Fallback to API ingestion** — Even with manual entry, the cron job should double-check by fetching from API-Football.
5. **Handle team name mapping** — API names (English) ≠ local names (Spanish). Maintain a comprehensive alias map.
