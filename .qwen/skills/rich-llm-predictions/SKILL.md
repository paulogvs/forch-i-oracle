---
name: rich-llm-predictions
description: Pattern for building rich, multi-dimensional AI predictions with structured output — score, confidence, key factors, form, team comparisons, and player spotlights
source: auto-skill
extracted_at: '2026-06-09T16:55:30.914Z'
---

# Rich LLM Prediction Pattern

When an AI prediction app needs to go beyond simple probabilities and deliver a professional, data-rich analysis, use this pattern.

> **⚠️ For accuracy-critical predictions (sports, finance, etc.), use the `statistical-prediction-engine` skill instead.** LLMs generate plausible text, not real calculations. The best pattern is: **math for numbers, LLM for narrative.** See `statistical-prediction-engine/SKILL.md` for the Poisson + Elo + xG approach.

## Architecture Overview

```
LLM (structured JSON) → Validator/Normalizer → UI Components
                                                  ├── Score display
                                                  ├── Confidence meter
                                                  ├── Form visualization
                                                  ├── Comparison bars
                                                  ├── Key factors
                                                  └── Player spotlights
```

## 1. Enhanced System Prompt

Ask for ALL the data you need in a single JSON response. Don't make multiple LLM calls — one comprehensive prompt is faster and cheaper.

```ts
const SYSTEM_PROMPT = `Respond ONLY with this JSON format:
{
  "homeWin": 55, "draw": 25, "awayWin": 20,
  "predictedScoreHome": 2, "predictedScoreAway": 1,
  "confidence": "alta",
  "analysis": "3-5 sentence tactical analysis",
  "keyFactors": [
    {"label": "Forma reciente", "homeAdvantage": 8, "description": "Brief description"},
    {"label": "Plantel", "homeAdvantage": 3, "description": "..."},
    {"label": "Historial directo", "homeAdvantage": -2, "description": "..."},
    {"label": "Ventaja local", "homeAdvantage": 5, "description": "..."}
  ],
  "homeKeyPlayers": ["Player 1", "Player 2"],
  "awayKeyPlayers": ["Player 1", "Player 2"],
  "homeFormLast5": ["W", "W", "D", "L", "W"],
  "awayFormLast5": ["L", "W", "W", "D", "W"],
  "homeAttackStrength": 85, "awayAttackStrength": 78,
  "homeDefenseStrength": 72, "awayDefenseStrength": 80,
  "homeMidfieldStrength": 80, "awayMidfieldStrength": 75
}`;
```

## 2. Robust Validator/Normalizer

The LLM will sometimes return incomplete or malformed data. Build a validator that:

- **Clamps values** to valid ranges (0-100 for percentages, 0-6 for scores)
- **Normalizes probabilities** so they sum to 100
- **Falls back to defaults** for missing arrays/fields
- **Handles edge cases** (NaN, null, wrong types)

```ts
function clampRange(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  return isNaN(n) ? fallback : Math.max(min, Math.min(max, Math.round(n)));
}

function normalizeForm(form: unknown): ('W' | 'D' | 'L')[] {
  if (!Array.isArray(form) || form.length === 0) return ['D', 'D', 'D', 'D', 'D'];
  return form.map(f => {
    const s = String(f).toUpperCase();
    return s === 'W' ? 'W' : s === 'L' ? 'L' : 'D';
  }).slice(0, 5);
}
```

## 3. Component Strategy

Break the result display into focused, composable components:

| Component | Props | Visual |
|-----------|-------|--------|
| **ConfidenceMeter** | `confidence: 'alta' \| 'media' \| 'baja'` | 3-bar indicator with color + icon |
| **FormBubbles** | `form: ('W'\|'D'\|'L')[]` | Colored circles (green/yellow/red) with V/E/D labels |
| **ComparisonBars** | `homeValue, awayValue` per category | Two-color segmented bar with percentage labels |
| **KeyFactors** | `{label, homeAdvantage, description}[]` | Mini bars from -10 (away favored) to +10 (home favored) |
| **PlayerSpotlight** | `players: string[]` | Simple list with dot indicators |

## 4. Server-Side Caching

LLM calls are expensive and slow. Cache predictions by team pair:

```ts
const CACHE_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const cache = new Map<string, { prediction: Prediction; expiresAt: number }>();

function makeCacheKey(home: string, away: string): string {
  return [home.toLowerCase(), away.toLowerCase()].sort().join('||');
}
```

Return `fromCache: true` in the API response so the frontend can show a "cached" indicator.

## 5. Team Data Enrichment

Pre-populate static team data (star players, confederation, group) so the UI has fallbacks even when the LLM doesn't return player names:

```ts
export interface Team {
  name: string;
  englishName: string;
  code: string;
  flag: string;
  confederation: string;
  group: string;
  starPlayers: string[]; // Fallback when LLM doesn't return players
}
```

## 6. Share Feature

Add a clipboard copy that formats the prediction as shareable text:

```ts
const shareText = `🔮 FORCH.i Oracle\n${homeFlag} ${homeTeam} ${scoreHome} - ${scoreAway} ${awayFlag} ${awayFlag}\nVictoria: ${homeTeam} (${homeWin}%)\nConfianza: ${confidence}\n\n${analysis}`;
```

## Gotchas

| Issue | Solution |
|-------|----------|
| LLM returns partial JSON | Use regex extraction fallback + per-field defaults |
| Confidence is invalid string | Default to 'media' with validation: `['alta','media','baja'].includes(val)` |
| Form array has wrong length | Pad to 5 with 'D', slice to max 5 |
| Key factors missing from LLM | Provide 4 default factors with neutral values |
| Player names in wrong language | LLM prompt prompt specifies language; fallback to `teams.ts` starPlayers |

## Probability Normalization — Robust Pattern

When normalizing LLM probabilities to sum to 100, **do NOT** compute all three independently with `Math.round()` and then use `last = 100 - first - second` — this can produce negative values if rounding drift is large.

Use this **drift-correction pattern** instead:

```ts
// Step 1: Clamp to valid ranges first
const homeWin = clampRange(parsed.homeWin, 0, 100, 40);
const draw    = clampRange(parsed.draw,    0, 100, 30);
const awayWin = clampRange(parsed.awayWin, 0, 100, 30);

const total = homeWin + draw + awayWin;

if (total === 0) {
  // All-zero fallback
  return { homeWin: 40, draw: 30, awayWin: 30 };
}

// Step 2: Compute raw percentages and round
let nWin  = Math.round((homeWin / total) * 100);
let nDraw = Math.round((draw / total) * 100);
let nAway = Math.round((awayWin / total) * 100);

// Step 3: Fix rounding drift by adjusting the LARGEST component
const drift = 100 - (nWin + nDraw + nAway);
if (drift !== 0) {
  if (nWin >= nDraw && nWin >= nAway)      nWin  += drift;
  else if (nDraw >= nAway)                 nDraw += drift;
  else                                      nAway += drift;
}

// Step 4: Safety clamp — ensure no negative values
nWin  = Math.max(0, nWin);
nDraw = Math.max(0, nDraw);
nAway = Math.max(0, nAway);

// Step 5: Final sanity check (handles edge case where clamping broke sum)
if (nWin + nDraw + nAway !== 100) {
  nAway = 100 - nWin - nDraw;
  nAway = Math.max(0, nAway);
}
```

**Why this works better than `last = 100 - first - second`:**
- Distributes rounding error to the component with the most room (the largest)
- Includes safety clamps to prevent negative values
- Has a final sanity check for edge cases where clamping broke the sum
