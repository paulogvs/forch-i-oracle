---
name: multi-lens-consensus
description: Show multiple analytical perspectives (lenses) on the same prediction using real computed data — each lens gives a verdict, and the UI aggregates them into a consensus view
source: auto-skill
extracted_at: '2026-06-10T17:02:31.380Z'
---

# Multi-Lens Consensus Pattern

Instead of showing a single prediction score, decompose the analysis into **multiple independent lenses** — each one evaluates the match from a different angle using real mathematical data, then the UI aggregates them into a consensus.

> **This is inspired by the "300 analysts" concept** but grounded in real data, not fictional personas. Each lens is a deterministic calculation from the prediction stats.

## Architecture

```
StatisticalPrediction (from Poisson + Elo engine)
    ↓
5 Lenses (computed client-side, zero API calls):
    ├── Motor Estadístico  → homeWin - awayWin differential
    ├── Forma Reciente     → W-count comparison from form arrays
    ├── Calidad de Plantel → AttackStrength comparison
    ├── Solidez Defensiva  → DefenseStrength comparison
    └── Ventaja Local      → KeyFactors entry for "local"
    ↓
Consensus aggregation:
    ├── Count votes per team
    ├── Show consensus badge (team + count/5)
    ├── Visual consensus bar (proportional segments)
    └── Per-lens cards with verdict, insight, confidence bar
```

## Implementation

```tsx
// LensConsensus.tsx
// Props: Prediction from statistical engine + homeTeam + awayTeam names

interface Lens {
  icon: string;
  name: string;
  verdict: string;  // homeTeam name, awayTeam name, or 'Empate'
  confidence: number; // 0-100 scale for mini bar
  color: string;    // Tailwind text color class
  insight: string;  // Short explanation
}

// Lens 1: Statistical Engine (Poisson + Elo)
const statDiff = prediction.homeWin - prediction.awayWin;
const statLens: Lens = {
  icon: '📊',
  name: 'Motor Estadístico',
  verdict: statDiff > 8 ? homeTeam : statDiff < -8 ? awayTeam : 'Empate',
  confidence: Math.abs(statDiff),
  insight: statDiff > 8
    ? `Poisson + Elo favorecen a ${homeTeam} (${prediction.homeWin}%)`
    : statDiff < -8
      ? `Poisson + Elo favorecen a ${awayTeam} (${prediction.awayWin}%)`
      : 'Modelo equilibrado — partido parejo',
};

// Lens 2: Recent Form
const homeWins = prediction.homeFormLast5.filter(f => f === 'W').length;
const awayWins = prediction.awayFormLast5.filter(f => f === 'W').length;
const formLens: Lens = {
  icon: '📈',
  name: 'Forma Reciente',
  verdict: homeWins > awayWins ? homeTeam : awayWins > homeWins ? awayTeam : 'Empate',
  confidence: Math.abs(homeWins - awayWins) * 20, // 0-100
  insight: homeWins > awayWins
    ? `${homeTeam} con mejor racha (${homeWins}V vs ${awayWins}V)`
    : 'Forma similar',
};

// Lens 3: Squad Quality (Attack)
const attackLens: Lens = {
  icon: '⭐',
  name: 'Calidad de Plantel',
  verdict: prediction.homeAttackStrength > prediction.awayAttackStrength ? homeTeam : awayTeam,
  confidence: Math.abs(prediction.homeAttackStrength - prediction.awayAttackStrength),
  insight: `${prediction.homeAttackStrength > prediction.awayAttackStrength ? homeTeam : awayTeam} con ataque superior`,
};

// Lens 4: Defense
const defenseLens: Lens = {
  icon: '🛡️',
  name: 'Solidez Defensiva',
  verdict: prediction.homeDefenseStrength > prediction.awayDefenseStrength ? homeTeam : awayTeam,
  confidence: Math.abs(prediction.homeDefenseStrength - prediction.awayDefenseStrength),
};

// Lens 5: Home Advantage
const homeAdvantage = prediction.keyFactors.find(f => f.label.toLowerCase().includes('local'));
const localLens: Lens = {
  icon: '🏟️',
  name: 'Ventaja Local',
  verdict: homeTeam,
  confidence: homeAdvantage ? Math.abs(homeAdvantage.homeAdvantage) * 10 : 20,
};
```

## UI Structure

```tsx
<div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
  {/* Header with consensus badge */}
  <div className="flex items-center justify-between mb-6">
    <h3>🔮 Consenso de Análisis</h3>
    <div>Consenso: {leader} ({leaderCount}/5)</div>
  </div>

  {/* Consensus bar */}
  <div className="flex rounded-full overflow-hidden h-2 mb-6">
    {sortedVotes.map(([team, count], i) => (
      <div style={{ width: `${(count / 5) * 100}%` }} className={colorClasses[i]} />
    ))}
  </div>

  {/* 5 lens cards in grid */}
  <div className="grid grid-cols-5 gap-3">
    {lenses.map(lens => (
      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
        <div>{lens.icon} {lens.name}</div>
        <div className="font-bold">{lens.verdict}</div>
        <p className="text-xs text-gray-500">{lens.insight}</p>
        <div className="h-1 bg-white/10 rounded-full mt-2">
          <div style={{ width: `${lens.confidence}%` }} className="bg-forch-gold" />
        </div>
      </div>
    ))}
  </div>
</div>
```

## Key Design Principles

1. **Zero additional API calls** — All 5 lenses derive from the existing Prediction object (homeWin, awayWin, form arrays, attack/defense strengths, keyFactors).
2. **Deterministic** — Same prediction always produces the same lens verdicts. No randomness.
3. **Thresholds for verdicts** — Don't favor a team for tiny differences. Use thresholds (e.g., statDiff > 8 for statistical lens).
4. **Empate as valid verdict** — When lenses are close, show 'Empate' — this communicates genuine uncertainty.
5. **Insights are auto-generated** — Build insight strings from the underlying data, never from LLM or hardcoded text.

## Adding More Lenses

The pattern is extensible. Other lenses you can add:

| Lens | Data Source | Verdict Logic |
|------|-------------|---------------|
| **Midfield Control** | homeMidfieldStrength vs awayMidfieldStrength | Higher wins |
| **xG Edge** | homeExpectedGoals vs awayExpectedGoals | Higher xG wins |
| **Over/Under 2.5** | over25Probability | >50% → Over, else Under |
| **BTTS** | bttsProbability | >50% → Yes, else No |
| **Dark Horse** | Inverse of favorite probability | Lower-rated team with high win% |

## Gotchas

| Issue | Solution |
|-------|----------|
| All lenses favor same team | Normal — shows a clear favorite. Highlight the consensus. |
| 3 vs 2 split | Show as "dividido" not "empate" — there's a majority. |
| Unknown team missing stats | Default to neutral verdict ('Empate') with confidence 0. |
| Key factors array doesn't have "local" | Default to homeAdvantage with fixed +5% (standard home edge). |
