# FORCH.i ORACLE — User Guide

## Overview
FORCH.i ORACLE is a closed-loop AI prediction system for the FIFA World Cup 2026. It uses Poisson + Dixon-Coles + Elo statistical models to predict all 128 matches and automatically recalculates as real results come in.

## Navigation (4 Panels)

### 1. Dashboard (📊)
- **Accuracy metrics**: Winner accuracy %, goal error, Over 2.5 accuracy
- **Trend graph**: Prediction accuracy over tournament days
- **Top 8 Elo rankings**
- **Quick navigation** to all panels

### 2. Predicción (⚡) — 3 Tabs

#### Tab: Predicciones (🔮)
- All 128 matches with predicted scores
- Toggle: **Partidos** (match cards) ↔ **Tablas** (standings tables)
- Toggle: **Por Fecha** ↔ **Por Grupo**
- Timezone selector (auto-detects your timezone)
- Tap any match → **Detail Modal** with:
  - Probabilities (1X2 bars)
  - Expected goals (xG), Over 2.5%, BTTS%
  - Elo comparison with difference
  - Attack/Midfield/Defense bars
  - Top 5 most likely scorelines
  - Confidence level (alta/media/baja)
  - **Knockout tie info**: "Empate 90 min → Penales/Alargue"

#### Tab: Top 8 (🏆)
- Champion probability ranking
- Progress bars with percentages
- "Simular" button to run 100 Monte Carlo simulations

#### Tab: Bracket (📐)
- Full knockout bracket from 1/16 to Final
- Predicted scores for each match
- Champion prediction

### 3. En Vivo (📈) — 2 Tabs

#### Tab: Tabla de Grupos (📋)
- Live standings recalculated from real results
- Full columns: PJ PG PE PP GF GC DG Pts
- Color-coded: green = qualifies, dim = eliminated
- When no results yet: shows "Esperando primeros resultados"

#### Tab: Eliminatorias (🏆)
- Live knockout bracket advancing with real winners
- Shows real scores vs predicted scores side by side
- Accuracy indicator: ✅ correct / ❌ incorrect

**"🔄 Actualizar" button**: Refreshes all data from the server.

### 4. Benchmark (🤖)
- 10 AI models comparison
- Champion consensus
- Model predictions table (campeón, sub, 3°, 4°)
- Leaderboard (when real results available)

## How the Auto-Update Works

```
API-Football (every 6h) → Cron Ingest → Real Results → Re-simulate Bracket → Updated Predictions
```

1. **Cron job** runs every 6-12 hours via GitHub Actions
2. **Scrapes** real World Cup results from API-Football
3. **Updates** team form, Elo, momentum
4. **Re-simulates** entire remaining bracket (100 runs)
5. **Live panel** shows updated standings, bracket, and accuracy

## Prediction Engine

### Statistical Model
- **Poisson distribution** for goal probability matrices
- **Dixon-Coles correction** for low-score draws
- **Elo ratings** for team strength (48 teams)
- **xG** (Expected Goals) competition-adjusted

### Enhanced Factors (v2)
- **Momentum**: Last 5 matches with exponential decay
- **Fatigue**: Days between matches penalty
- **Home Advantage**: WC2026 realistic (+8% hosts)
- **Altitude**: FIFA research-based (Mexico City -15%)
- **Travel Distance**: Haversine-based venue-to-venue
- **Injury Impact**: Player role-weighted penalty

## Key Features
- **Zero hardcoded data** — everything computed from statistics
- **Timezone aware** — all times converted to your local timezone
- **Responsive** — works on mobile, tablet, and desktop
- **Dark theme** — FORCH.i gold (#C9A227) accent color
- **All UI in Spanish**

## Technical Stack
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS 3.4
- Groq Llama 3.3 70B (narrative analysis only)
- API-Football (free tier)
- Supabase (optional PostgreSQL)

---
*FORCH.i © 2026 · Built by Paulo Velasco*
