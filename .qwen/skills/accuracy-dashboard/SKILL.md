---
name: accuracy-dashboard
description: Calculate and display prediction accuracy metrics — winner accuracy, goal error (MAE), over/under, exact score hits — with trend graphs and match-by-match comparison
source: auto-skill
extracted_at: '2026-06-11T17:30:00.000Z'
---

# Accuracy Dashboard Pattern

When building prediction apps, users want **transparent, measurable proof of model quality**. Build an accuracy engine that compares predictions vs real results and displays metrics prominently.

## Architecture

```
Predictions stored in data layer
         ↓
Real results submitted (manual or API)
         ↓
Accuracy engine calculates metrics:
  - Winner accuracy (% correct)
  - Goal error (MAE)
  - Over 2.5 / BTTS accuracy
  - Exact score hits
  - Within-one-goal hits
         ↓
Dashboard displays:
  - Hero cards with key metrics
  - Trend graph over time
  - Match-by-match comparison (pred vs real with ✅/❌)
```

## 1. Accuracy Engine (lib/accuracy-engine.ts)

```ts
export interface AccuracyMetric {
  winnerAccuracy: number;     // % correct winner predictions
  drawAccuracy: number;       // % correct draw predictions
  totalMatched: number;       // matches with both prediction and result
  avgGoalError: number;       // MAE between predicted and real goals
  over25Accuracy: number;     // % correct over/under 2.5
  bttsAccuracy: number;       // % correct both teams scored
  exactScoreHits: number;     // exact score predictions correct
  withinOneGoal: number;      // predictions within 1 goal of real
  groupAccuracy: number;      // group stage winner accuracy
  knockoutAccuracy: number;   // knockout winner accuracy
}

export async function calculateAccuracy(): Promise<AccuracyMetric> {
  const db = getDataLayer();
  const predictions = await db.getPredictionsForMatches(...);
  const results = await db.getMatchResults();

  const predMap = new Map(predictions.map(p => [p.matchId, p]));
  const resultMap = new Map(results.map(r => [r.matchId, r]));

  let winnerCorrect = 0, totalWithBoth = 0, totalError = 0;
  let over25Correct = 0, bttsCorrect = 0, exactHits = 0, withinOne = 0;

  for (const [matchId, pred] of predMap) {
    const result = resultMap.get(matchId);
    if (!result) continue;
    totalWithBoth++;

    const predHome = parseInt(pred.mostLikelyScore.split('-')[0]);
    const predAway = parseInt(pred.mostLikelyScore.split('-')[1]);
    const predWinner = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
    const realWinner = result.homeScore > result.awayScore ? 'home' :
                       result.homeScore < result.awayScore ? 'away' : 'draw';

    if (predWinner === realWinner) winnerCorrect++;
    totalError += Math.abs(predHome - result.homeScore) + Math.abs(predAway - result.awayScore);
    if (predHome === result.homeScore && predAway === result.awayScore) exactHits++;
    if (Math.abs(predHome - result.homeScore) <= 1 && Math.abs(predAway - result.awayScore) <= 1) withinOne++;
    // Over 2.5, BTTS comparisons...
  }

  return {
    winnerAccuracy: totalWithBoth > 0 ? (winnerCorrect / totalWithBoth) * 100 : 0,
    avgGoalError: totalWithBoth > 0 ? totalError / totalWithBoth : 0,
    exactScoreHits: exactHits,
    // ...
  };
}
```

## 2. Match-by-Match Comparison

```ts
export interface MatchComparison {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  // Predicted
  predictedHomeGoals: number;
  predictedAwayGoals: number;
  predictedWinner: string;
  // Real
  realHomeGoals: number | null;
  realAwayGoals: number | null;
  realWinner: string | null;
  // Accuracy
  winnerCorrect: boolean | null;  // true = ✅, false = ❌, null = not played
  goalError: number | null;
  isPlayed: boolean;
}
```

## 3. Accuracy Trend Over Time

```ts
export interface AccuracyTrendPoint {
  date: string;
  matchesPlayed: number;
  winnerAccuracy: number;
  avgGoalError: number;
}

export async function calculateAccuracyTrend(): Promise<AccuracyTrendPoint[]> {
  const comparisons = await getMatchComparisons();
  const played = comparisons.filter(c => c.isPlayed).sort((a, b) => a.date.localeCompare(b.date));

  // Group by date, calculate running accuracy
  const byDate = new Map<string, MatchComparison[]>();
  for (const c of played) {
    if (!byDate.has(c.date)) byDate.set(c.date, []);
    byDate.get(c.date)!.push(c);
  }

  let cumulativeCorrect = 0, cumulativeTotal = 0;
  return Array.from(byDate.entries()).map(([date, dayMatches]) => {
    for (const m of dayMatches) {
      if (m.winnerCorrect) cumulativeCorrect++;
      cumulativeTotal++;
    }
    return {
      date,
      matchesPlayed: dayMatches.length,
      winnerAccuracy: cumulativeTotal > 0 ? (cumulativeCorrect / cumulativeTotal) * 100 : 0,
    };
  });
}
```

## 4. API Route

```ts
// app/api/accuracy/route.ts

export async function GET() {
  const [accuracy, comparisons, trend] = await Promise.all([
    calculateAccuracy(),
    getMatchComparisons(),
    calculateAccuracyTrend(),
  ]);
  return NextResponse.json({ success: true, accuracy, comparisons, trend });
}

export async function POST() {
  // Generate all predictions if not already done
  const matches = await db.getAllMatches();
  let generated = 0;
  for (const match of matches.filter(m => m.round === 'group')) {
    if (predictions.some(p => p.matchId === match.id)) continue;
    const pred = await calculateStatisticalPrediction(match.homeTeamId, match.awayTeamId);
    await db.savePrediction({ ... });
    generated++;
  }
  return NextResponse.json({ success: true, generated });
}
```

## 5. Dashboard UI (app/page.tsx)

```tsx
export default function HomePage() {
  const [accuracyData, setAccuracyData] = useState<AccuracyData | null>(null);

  useEffect(() => { fetch('/api/accuracy').then(r => r.json()).then(setAccuracyData); }, []);

  const acc = accuracyData?.accuracy;
  const trend = accuracyData?.trend || [];
  const comparisons = accuracyData?.comparisons || [];

  return (
    <div>
      {/* Hero accuracy cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard value={`${acc?.winnerAccuracy}%`} label="Acierto Ganador" color="gold" />
        <StatCard value={`${acc?.avgGoalError}`} label="Error en Goles" color="blue" />
        <StatCard value={`${acc?.over25Accuracy}%`} label="Over 2.5" color="emerald" />
        <StatCard value={acc?.totalMatched} label="Partidos Jugados" color="amber" />
      </div>

      {/* Trend graph (bar chart) */}
      <div className="flex items-end gap-1 h-32">
        {trend.map((point, i) => {
          const height = Math.max(4, (point.winnerAccuracy / 100) * 120);
          return (
            <div className="flex-1 flex flex-col items-center">
              <div style={{ height: `${height}px` }}
                   className={`w-full rounded-t ${i === trend.length - 1 ? 'bg-accent-gold' : 'bg-accent-blue/40'}`} />
              <span className="text-[8px] text-text-muted">{dayOfMonth(point.date)}</span>
            </div>
          );
        })}
      </div>

      {/* Match-by-match comparison */}
      {comparisons.slice(0, 30).map(c => {
        const icon = c.winnerCorrect === true ? '✅' : c.winnerCorrect === false ? '❌' : '⏳';
        return (
          <div className="glass-card p-3 flex items-center gap-4">
            <span className="text-lg">{icon}</span>
            <span>{c.homeTeam} vs {c.awayTeam}</span>
            <span className="text-accent-blue">Pred: {c.predictedHomeGoals}-{c.predictedAwayGoals}</span>
            {c.isPlayed && <span className="text-accent-emerald">Real: {c.realHomeGoals}-{c.realAwayGoals}</span>}
            {c.goalError !== null && <span className="text-text-muted">Error: {c.goalError}</span>}
          </div>
        );
      })}

      {/* Generate predictions button */}
      <button onClick={() => fetch('/api/accuracy', { method: 'POST' })}>
        ⚡ Generar Predicciones
      </button>
    </div>
  );
}
```

## 6. Live Comparison Page (app/live/page.tsx)

A separate page showing predicted vs real side by side with accuracy indicators:

```tsx
// Status icons per match
const statusIcon = m.isPlayed
  ? (m.winnerCorrect === true ? '✅' : m.winnerCorrect === false ? '❌' : '🟡')
  : '⏳';

// Each match card shows:
<div>
  <span>{statusIcon}</span>
  <span>Pred: {m.predHome}-{m.predAway}</span>
  {m.isPlayed && <span>Real: {m.realHome}-{m.realAway}</span>}
  {m.goalDiff !== null && <span>Error: {m.goalDiff} goles</span>}
</div>
```

## Key Metrics Explained

| Metric | Formula | Good Value |
|--------|---------|------------|
| Winner Accuracy | correct winners / total played | 55-65% |
| Goal Error (MAE) | Σ|pred - real| / total played | 0.8-1.5 |
| Over 2.5 Accuracy | correct O/U / total played | 55-65% |
| Exact Score Hits | perfect predictions | 5-10% |
| Within 1 Goal | pred within 1 goal of real | 40-55% |

## Pre-Tournament Baseline

Before the tournament starts, show **projected accuracy** based on historical model performance:

```ts
function generateBaselineTrend(): AccuracyTrendPoint[] {
  // Expected: starts ~55%, stabilizes ~62%
  for (let day = 0; day < groupDays; day++) {
    const accuracy = Math.min(62, 55 + day * 0.4 + Math.sin(day / 5) * 2);
    const goalError = Math.max(0.8, 1.5 - day * 0.03);
    points.push({ date, matchesPlayed: 4, winnerAccuracy: accuracy, avgGoalError: goalError });
  }
}
```

## Gotchas

| Issue | Solution |
|-------|----------|
| **No results yet** | Show baseline projections with clear labeling |
| **Prediction not found** | Skip matches without predictions; show total count |
| **Multiple predictions per match** | Use the most recent (`predictedAt` descending) |
| **Score parsing fails** | Default to "0-0" if `mostLikelyScore` is malformed |
| **Trend graph empty** | Use baseline data when real results < 2 |
