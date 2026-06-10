---
name: living-prediction-engine
description: Bayesian-updating statistical prediction engine for sports that improves with each real match result, using exponential decay and momentum tracking
source: auto-skill
extracted_at: '2026-06-10T19:14:10.164Z'
---

# Living Prediction Engine Pattern

When building sports prediction apps that run over the course of a tournament, static ratings (ELO, power ratings) are insufficient. Build a **living engine** that updates its model with each real match result.

## Architecture

```
Pre-tournament → Static ELO + Power Ratings as baseline priors
During tournament → Real results trigger Bayesian updates
                  → Exponential decay weights recent matches more
                  → xG tracking identifies over/under-performers
                  → Momentum score captures winning/losing streaks
```

## 1. Data Model

```ts
interface TeamFormEntry {
  goalsScored: number[];     // Per match
  goalsConceded: number[];   // Per match
  xGFor: number[];          // Expected goals created
  xGAgainst: number[];      // Expected goals conceded
  points: number[];          // 3=win, 1=draw, 0=loss
  opponentElo: number[];     // Strength of opponents
  dates: string[];           // For temporal ordering
}

interface TeamDynamicStats {
  elo: number;              // Updated ELO
  attackStrength: number;   // Goals scored per match (decay-weighted)
  defenseStrength: number;  // Goals conceded per match (decay-weighted)
  xGDiff: number;           // xG For - xG Against (performance indicator)
  formPoints: number;       // Weighted recent form (0-15 scale)
  momentum: number;         // -1 to +1 (losing streak to winning streak)
  matchesPlayed: number;
  lastUpdated: string;
}
```

## 2. Core: Ingest Real Results

```ts
const teamForms = new Map<string, TeamFormEntry>();
const DECAY_FACTOR = 0.85;  // Match from 3 games ago has ~52% weight
const PRIOR_WEIGHT = 3;     // Blend with prior after N actual matches

export function addMatchResult(result: MatchResult): void {
  updateTeamForm(result.homeTeam, result.homeGoals, result.awayGoals,
                 result.homeXG ?? result.homeGoals, result.awayXG ?? result.awayGoals,
                 result.date, getTeamElo(result.awayTeam));
  updateTeamForm(result.awayTeam, result.awayGoals, result.homeGoals,
                 result.awayXG ?? result.awayGoals, result.homeXG ?? result.homeGoals,
                 result.date, getTeamElo(result.homeTeam));
}
```

## 3. Exponential Decay Weighting

```ts
function getDecayWeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.pow(DECAY_FACTOR, n - 1 - i));
}

function weightedAvg(values: number[], weights: number[], totalWeight: number): number {
  const sum = values.reduce((acc, v, i) => acc + v * weights[i], 0);
  return totalWeight > 0 ? sum / totalWeight : 0;
}
```

With DECAY_FACTOR = 0.85:
- Match 5 (most recent): 1.00
- Match 4: 0.85
- Match 3: 0.72
- Match 2: 0.61
- Match 1 (oldest): 0.52

## 4. Bayesian Blend with Prior

```ts
function bayesianBlend(actual: number, prior: number, n: number, priorWeight: number): number {
  const actualWeight = n;
  const totalWeight = actualWeight + priorWeight;
  return (actual * actualWeight + prior * priorWeight) / totalWeight;
}
```

When n=0 (no matches): result = prior (100% prior weight)
When n=3: result = 50% actual + 50% prior
When n=10: result = 77% actual + 23% prior

## 5. Momentum Calculation

```ts
function calculateMomentum(points: number[], scored: number[], conceded: number[]): number {
  const recent = points.slice(-5);
  const firstHalf = recent.slice(0, Math.ceil(recent.length / 2));
  const secondHalf = recent.slice(Math.ceil(recent.length / 2));
  
  const trend = (avg(secondHalf) - avg(firstHalf)) / 3;  // Normalize to -1..1
  const currentForm = recent[recent.length - 1] / 3;     // 0, 0.33, or 1
  
  return clamp(currentForm * 0.6 + trend * 0.4, -1, 1);
}
```

Momentum > 0: Team is improving/on a hot streak
Momentum < 0: Team is declining/cold streak

## 6. Dynamic Prediction

```ts
export function predictMatchDynamic(homeTeam: string, awayTeam: string): DynamicPrediction {
  const homeStats = getDynamicStats(homeTeam);
  const awayStats = getDynamicStats(awayTeam);
  
  // Expected goals: attack × defense × home advantage
  const homeLambda = homeStats.attackStrength * awayStats.defenseStrength * 1.12;
  const awayLambda = awayStats.attackStrength * homeStats.defenseStrength;
  
  // Adjust for ELO difference
  const eloDiff = homeStats.elo - awayStats.elo;
  const eloAdjustment = eloDiff / 400;
  
  // Adjust for momentum
  const homeAdj = 1 + homeStats.momentum * 0.15;
  const awayAdj = 1 + awayStats.momentum * 0.15;
  
  const finalHomeLambda = Math.max(0.2, homeLambda * (1 + eloAdjustment * 0.3) * homeAdj);
  const finalAwayLambda = Math.max(0.2, awayLambda * (1 - eloAdjustment * 0.3) * awayAdj);
  
  // Poisson outcome probabilities
  const { homeWin, draw, awayWin } = poissonOutcome(finalHomeLambda, finalAwayLambda);
  
  return {
    homeExpectedGoals: round(finalHomeLambda, 2),
    awayExpectedGoals: round(finalAwayLambda, 2),
    homeWinPct: round(homeWin * 1000, 1) / 10,
    predictedScore: [Math.round(finalHomeLambda), Math.round(finalAwayLambda)],
    confidence: Math.min(95, Math.max(homeWin, draw, awayWin) * 100),
    hasRealData: homeStats.matchesPlayed > 0 || awayStats.matchesPlayed > 0,
  };
}
```

## 7. ELO Update from Real Results

```ts
function calculateEloUpdate(form: TeamFormEntry, n: number): number {
  if (n === 0) return 0;
  const K = 20;
  let eloChange = 0;
  
  for (let i = 0; i < form.points.length; i++) {
    const actualResult = form.points[i] / 3;  // 0, 0.33, or 1
    const eloDiff = 1650 - form.opponentElo[i];
    const expectedWin = 1 / (1 + Math.pow(10, -eloDiff / 400));
    eloChange += K * (actualResult - expectedWin);
  }
  
  return eloChange / n;  // Average per match
}
```

## 8. Usage in API Route

```ts
// Ingest real results before prediction
const { realResults = [] } = body;
for (const r of realResults) {
  addMatchResult(r);
}

// Use dynamic prediction when data is available
const pred = predictMatchDynamic(homeTeam, awayTeam);

// Fall back to static engine if no real data yet
if (!pred.hasRealData) {
  const stat = await calculateStatisticalPrediction(homeTeam, awayTeam);
  return stat;
}
return pred;
```

## Key Principles

1. **Never replace baseline entirely** — always blend with prior using Bayesian weighting
2. **Decay is essential** — a team's form from 10 matches ago matters less than today
3. **xG > actual goals** — expected goals are more predictive than actual results
4. **Momentum is real** — teams on winning streaks perform better than their raw stats suggest
5. **In-memory store is fine for serverless** — reset on each deployment, re-ingest from API

## When to Use vs Static Engine

| Phase | Engine | Reason |
|-------|--------|--------|
| Pre-tournament | Static ELO + Poisson | No real data yet |
| Matchday 1-2 | Static + light Bayesian blend | Too few samples |
| Matchday 3-5 | Dynamic with 50/50 blend | Enough data, prior still matters |
| Matchday 6+ | Dynamic dominant | 70%+ actual data weight |
| Quarterfinals+ | Full dynamic | 6+ matches of real data per team |
