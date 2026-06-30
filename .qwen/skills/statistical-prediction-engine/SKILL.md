---
name: statistical-prediction-engine
description: Build a state-of-the-art mathematical prediction engine (Poisson + Elo + xG + Bayesian ensemble) for sports — numbers come from formulas only, no LLM dependency
source: auto-skill
extracted_at: '2026-06-10T15:35:58.162Z'
updated_at: '2026-06-30'
---

# Statistical Prediction Engine Pattern (Living — 2026)

For accurate probability predictions in sports (or any domain with historical data), compute the numbers with mathematical models — Poisson + Elo + xG + Bayesian ensemble. This app is fully statistical, with no LLM layer.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    API Route                        │
│                                                     │
│  1. predictor-engine.calculate()  → numbers (math) │
│  2. football-api.getMatchContext() → real data      │
│  3. getKeyFactors(stats)           → factors (math)│
│  4. enhanced-engine.ensemble()    → refinement      │
│  5. Output: stats + factors + confidence           │
└─────────────────────────────────────────────────────┘
```

## 1. Poisson Distribution for Goal Probabilities

The standard model for football prediction. Calculate expected goals (λ) for each team, then compute the probability of every possible scoreline.

```ts
// P(X=k) = (λ^k * e^-λ) / k!
function poissonProbability(lambda: number, k: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

// Expected goals = (team_attack + rival_defense) / 2 × home_factor × elo_factor
function calculateExpectedGoals(
  attackingTeam: string,
  defendingTeam: string,
  isHomeTeam: boolean,
  formAdjustment: number = 0
): number {
  const attack = getElo(attackingTeam).attack;   // avg goals scored
  const defense = getElo(defendingTeam).defense; // avg goals conceded

  const baseGoals = (attack + defense) / 2;
  const homeFactor = isHomeTeam ? 1.12 : 0.92;    // +12% home, -8% away
  const eloDiff = getElo(attackingTeam).elo - getElo(defendingTeam).elo;
  const eloFactor = 1 + (eloDiff / 500);           // ±20% per 100 Elo points

  return Math.max(0.3, Math.min(4.0,
    baseGoals * homeFactor * Math.max(0.6, Math.min(1.4, eloFactor)) * (1 + formAdjustment)
  ));
}

// Build full probability matrix (0-0 through 6-6)
function calculateMatchProbabilities(homeLambda: number, awayLambda: number) {
  let homeWin = 0, draw = 0, awayWin = 0;
  const matrix: number[][] = [];

  for (let h = 0; h < 7; h++) {
    matrix[h] = [];
    for (let a = 0; a < 7; a++) {
      const prob = poissonProbability(homeLambda, h) * poissonProbability(awayLambda, a);
      matrix[h][a] = prob;
      if (h > a) homeWin += prob;
      else if (h === a) draw += prob;
      else awayWin += prob;
    }
  }

  // Normalize to percentages
  const total = homeWin + draw + awayWin;
  return {
    homeWin: Math.round((homeWin / total) * 100),
    draw: Math.round((draw / total) * 100),
    awayWin: 0, // computed as 100 - homeWin - draw
    scoreMatrix: matrix,
  };
}
```

## 2. Elo Ratings Database

Store Elo ratings for all entities. This is the single most important data source.

```ts
interface EloEntry {
  elo: number;     // Overall rating (1400-2100+)
  attack: number;  // Avg goals scored (last 12 months)
  defense: number; // Avg goals conceded (last 12 months)
}

const ELO_RATINGS: Record<string, EloEntry> = {
  'Argentina': { elo: 2109, attack: 2.1, defense: 0.6 },
  'Francia':   { elo: 2087, attack: 2.3, defense: 0.7 },
  'España':    { elo: 2065, attack: 2.4, defense: 0.8 },
  // ... all teams
};
```

**Where to get Elo ratings:**
- ClubElo.com (club football)
- elofootball.com (national teams)
- FIFA rankings (coarser but official)

## 3. Form Adjustment

Weighted recent form affects expected goals:

```ts
function formToAdjustment(form: ('W' | 'D' | 'L')[]): number {
  const weights = [0.5, 0.7, 0.9, 1.0, 1.2]; // recent matches weigh more
  let adj = 0;
  for (let i = 0; i < form.length; i++) {
    const w = weights[Math.min(i, weights.length - 1)];
    if (form[i] === 'W') adj += 0.03 * w;
    else if (form[i] === 'L') adj -= 0.03 * w;
  }
  return Math.max(-0.15, Math.min(0.15, adj));
}
```

## 4. Strength Ratings (0-100 Scale)

Convert raw stats to UI-friendly ratings:

```ts
function eloToScore(elo: number): number {
  // Linear scale: 1400→30, 2100→95
  return Math.round(Math.max(15, Math.min(99, ((elo - 1400) / 700) * 65 + 30)));
}

function calculateTeamStrengths(teamName: string, isHome: boolean) {
  const entry = getElo(teamName);
  const attack = Math.round(Math.max(20, Math.min(98, (entry.attack / 3.0) * 100)));
  const defense = Math.round(Math.max(20, Math.min(98, ((3.0 - entry.defense) / 3.0) * 100)));
  const midfield = Math.round(attack * 0.3 + defense * 0.3 + eloToScore(entry.elo) * 0.4);
  const boost = isHome ? 3 : 0;
  return { attack: attack + boost, defense: defense + boost, midfield: midfield + boost };
}
```

## 5. Narrative Analysis — From Stats

When you want a brief human-readable explanation, compute it from the stats (no LLM):

```ts
function generateAnalysis(stats, homeTeam, awayTeam) {
  const lines = [];
  const eloDiff = stats.homeElo - stats.awayElo;

  if (Math.abs(eloDiff) > 50) {
    const stronger = eloDiff > 0 ? homeTeam : awayTeam;
    lines.push(`${stronger} tiene clara ventaja en rating Elo (+${Math.abs(eloDiff)} puntos).`);
  } else {
    lines.push('Encuentro equilibrado según ratings Elo.');
  }

  if (stats.homeExpectedGoals > stats.awayExpectedGoals * 1.2) {
    lines.push(`${homeTeam} genera más oportunidades esperadas (xG ${stats.homeExpectedGoals.toFixed(2)}).`);
  }

  lines.push(`Marcador más probable: ${stats.predictedScoreHome}-${stats.predictedScoreAway}.`);
  return lines.join(' ');
}
```

## 6. Key Factors — Calculated, Not Invented

```ts
function getKeyFactors(stats, homeTeam, awayTeam, homeForm, awayForm, homeInjuries, awayInjuries) {
  const factors = [];

  // Form factor: count wins, compare
  const hWins = (homeForm || []).filter(r => r === 'W').length;
  const aWins = (awayForm || []).filter(r => r === 'W').length;
  factors.push({
    label: 'Forma reciente',
    homeAdvantage: Math.max(-10, Math.min(10, (hWins - aWins) * 3)),
    description: hWins > aWins
      ? `${homeTeam} con mejor racha (${hWins}V vs ${aWins}V)`
      : 'Forma similar entre ambos',
  });

  // Elo/quality factor
  const eloDiff = stats.homeElo - stats.awayElo;
  factors.push({
    label: 'Calidad del plantel',
    homeAdvantage: Math.max(-10, Math.min(10, Math.round(eloDiff / 30))),
    description: eloDiff > 50
      ? `${homeTeam} superior en rating Elo (+${eloDiff})`
      : 'Equipos de nivel similar',
  });

  // Home advantage
  factors.push({
    label: 'Ventaja de local',
    homeAdvantage: stats.homeWin > stats.awayWin ? 4 : 2,
    description: `Factor local en ${homeTeam}`,
  });

  return factors.slice(0, 4);
}
```

## 7. Confidence Determination

```ts
const maxProb = Math.max(stats.homeWin, stats.draw, stats.awayWin);
const confidence = maxProb >= 55 ? 'alta' : maxProb >= 40 ? 'media' : 'baja';
```

## What This Pattern Achieves

| Aspect | Method | Reproducibility |
|--------|--------|-----------------|
| Probabilities | Poisson distribution | Same inputs = same output |
| Scores | Most likely from probability matrix | Deterministic |
| Attack/Defense | Calculated from Elo + goals data | Mathematically grounded |
| Key factors | Derived from form, Elo, injuries | Reproducible |
| Analysis text | Built from stats (no LLM) | Deterministic phrase generation |
| Reproducibility | 100% — pure math | Same inputs = same output |
| Accuracy | Mathematically grounded | Subject to model assumptions |

## Gotchas

| Issue | Solution |
|-------|----------|
| Unknown team in Elo database | Use default (Elo 1500, attack 0.7, defense 1.5) |
| Poisson gives unrealistic scores | Clamp λ to 0.3-4.0; matrix up to 6 goals only |
| Home advantage over-weighted | +12% is standard; adjust per sport/league |
| Form data unavailable | Default to 0 adjustment; skip form factor |
| Out-of-date xG | Live ingest updates form from real results |
