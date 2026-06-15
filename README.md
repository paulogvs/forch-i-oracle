# FORCH.i ORACLE ⚽🔮

> **Built with FORCH.i by Paulo Velasco** · Poisson + Dixon-Coles + Elo + xG

AI-powered sports predictions for FIFA World Cup 2026 — a **closed-loop prediction circuit** that automatically recalculates as real results come in.

---

## 🏗 Architecture

### Core Engine
| Component | Description |
|---|---|
| **Poisson + Dixon-Coles** | Statistical model calculating goal probability matrices (0-6 goals per side) |
| **Elo Ratings** | 48 teams with attack/defense/midfield ratings from real data |
| **xG (Expected Goals)** | Competition-adjusted scoring expectations |
| **Enhanced Engine v2** | Momentum, fatigue, altitude, travel distance, injury impact, H2H |

### Closed-Loop Circuit
```
API-Football (cada 6h) → Cron Ingest → Supabase/Store → Re-simulate → Panel En Vivo
```

---

## 📱 Pages (4 Panels)

| Route | Purpose |
|---|---|
| `/` | **📊 Dashboard** — Reordenado: Partido del Día → En Vivo → Próximos → Resultados por fecha → Campeón |
| `/fixture` | **⚡ Predicción** — 4 tabs: Partidos, Tablas, Top 8, Bracket |
| `/live` | **📈 En Vivo** — Real results vs predictions, live standings, live bracket |
| `/benchmark` | **🤖 Benchmark** — 10 AI models comparison, champion consensus, ORACLE vs Modelos |

### Dashboard — Reordenado (v2)
El dashboard ahora sigue el flujo natural del usuario:

1. **Header + Métricas** — Accuracy, MAE, Over 2.5, Jugados (2x2 grid)
2. **⭐ Partido del Día** — Match más equilibrado con probabilidades de cada equipo
3. **🔴 En Vivo** — Matches en curso con dot pulsante, tiempo, goleadores
4. **⏰ Próximos Partidos** — Siguientes 4 partidos con predicción
5. **✅ Resultados Reales** — Agrupados por fecha con separadores + badge de aciertos por día
6. **🏆 Campeón del Mundo** — Top 8 probabilidades con barras animadas (auto-ajusta con resultados reales)
7. **🧭 Navegación** — Links rápidos a /fixture, /live, /benchmark

#### Funcionalidades del Dashboard
- **Auto-ajuste**: Cuando un resultado real se registra, las predicciones y el campeón se recalculan automáticamente
- **Resultados por fecha**: Cada día muestra aciertos (ej: "3/5" en verde/amarillo/rojo)
- **Animaciones**: Entrada suave con motion/react (Framer Motion) en cada sección
- **Empty states**: Mensajes contextuales cuando no hay datos

### Panel Predicción — 4 Tabs
- **⚽ Partidos**: All 128 matches with predicted scores. Phase filter (Todos/Grupos/1/16/1/8/1/4/Semis/Final). Tap any match → Detail Modal
- **📊 Tablas**: Live group standings from real-time data
- **🏆 Top 8**: Champion probability ranking with progress bars
- **📐 Bracket**: Full knockout bracket from 1/16 to Final with predicted scores

### Panel En Vivo — 3 Tabs
- **🎮 Juego**: Currently playing matches with live scores
- **📋 Resultados**: Finished matches with real vs predicted comparison
- **⏳ Pendiente**: Upcoming matches

**"🔄 Actualizar" button**: Refreshes all data from the persistent store.

---

## ⚙️ API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/predict` | POST | Single match prediction (enhanced engine) |
| `/api/fixture` | POST | All 128 match predictions with knockout resolution |
| `/api/accuracy` | GET/POST | Accuracy metrics, match comparisons, trend data |
| `/api/match-result` | POST | Submit real result → auto-recalculate affected predictions |
| `/api/simulate-tournament` | POST/GET | 100 simulations → champion probs, live standings, live bracket |
| `/api/live-update` | POST/GET | Real result → re-simulate → return drift data |
| `/api/cron/ingest` | GET | Data ingestion from API-Football (World Cup fixtures) |
| `/api/cron/recalculate` | GET | Recalculate all upcoming match predictions |
| `/api/cron/simulate` | GET | Daily tournament re-simulation |
| `/api/cron/status` | GET | Cron job status dashboard |

---

## 🔄 Cron Jobs (GitHub Actions)

| Job | Schedule | Purpose |
|---|---|---|
| `ingest-data` | Every 6h | Fetch World Cup results from API-Football, update team forms |
| `recalculate-predictions` | Every 12h | Recalculate predictions for upcoming matches |
| `simulate-tournament` | Daily 00:00 UTC | 100 tournament simulations, update champion probabilities |

---

## 🧮 Prediction Engine

### Statistical Model
1. **Elo-based lambda**: `λ = (attack + defense_rival) / 2 × homeFactor × eloFactor`
2. **Dixon-Coles correction**: τ factor for low-score cells (0-0, 1-0, 0-1, 1-1)
3. **Score matrix**: 7×7 grid (0-6 goals per side)
4. **1X2 derivation**: Sum probabilities for home/draw/away

### Enhanced Factors (v2)
| Factor | Impact |
|---|---|
| **Momentum** | Exponential decay of last 5 matches (-1.0 to +1.0) |
| **Fatigue** | Days between matches penalty (-0.15 to +0.05) |
| **Home Advantage** | WC2026 realistic (host +8%, continent +3-5%) |
| **Altitude** | FIFA research-based (Mexico City 2200m = -15% non-acclimated) |
| **Travel Distance** | Haversine venue-to-venue fatigue (-0.10 for >3000km) |
| **Injury Impact** | Player role-weighted penalty (GK -8%, FWD -6%) |
| **Competition xG** | World Cup goals weighted higher than friendlies |

### Knockout Tie Resolution
When predicted score is a draw in knockout stages:
- Shows "Empate 90 min → Penales/Alargue"
- Home team wins by default (advances to next round)
- Third place match uses SF losers

---

## 💾 Data Persistence

### Production (Supabase)
When `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set:
- Results, forms, and predictions persist **across Vercel deploys**
- 5 tables: `match_results`, `team_forms`, `predictions`, `tournament_probs`, `cron_status`
- Full setup guide: [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)

### Development (File Store)
Without Supabase env vars:
- Falls back to `lib/file-store.ts` — JSON files in `.forchi-data/`
- Survives between requests within same deploy
- Wiped on new Vercel deploy

### Fallback (In-Memory)
If neither is available:
- In-memory Maps auto-seeded from `lib/teams.ts` and `lib/matches.ts`

---

## 🔄 Caching & Performance

All data fetching uses **SWR** (stale-while-revalidate) for optimal user experience:

- **Instant panel switching** — SWR caches data and shows it immediately, no loading spinners
- **Smart refresh intervals** — During match windows (10-22 CDT), polls every 2 minutes; otherwise every 30 minutes
- **Deduplication** — Multiple components requesting the same data share a single request
- **Revalidate on focus** — Data refreshes when the user returns to the tab
- **Error retry** — Automatic retry with exponential backoff

### SWR Hooks
| Hook | Endpoint | Refresh |
|---|---|---|
| `useFixture()` | POST `/api/fixture` | Smart (2min/30min) |
| `useSimulation()` | GET `/api/simulate-tournament` | Smart (2min/30min) |
| `useLiveScores()` | GET `/api/live-scores` | 30 seconds |
| `useAccuracy()` | GET `/api/accuracy` | Smart (2min/30min) |

---

## 🚀 Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables (`.env.local`)
```env
# Required
GROQ_API_KEY=gsk_your_key_here

# For real data ingestion (optional)
FOOTBALL_API_KEY=your_api_football_key

# For persistent data across deploys (optional, see SUPABASE_SETUP.md)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbG...

# For cron job protection (optional)
CRON_SECRET=your-secret-here
```

### 3. Run
```bash
npm run dev       # Development server
npm run build     # Production build
npm start         # Production server
npm run test:run  # Run tests
```

### 4. Deploy to Vercel
```bash
vercel --prod
```
Add environment variables in Vercel dashboard before deploying.

---

## 📈 Accuracy Tracking

The Dashboard (`/`) shows real-time prediction accuracy:
- **Winner Accuracy**: % of correct match winner predictions
- **Goal Error (MAE)**: Average absolute difference predicted vs real scores
- **Over 2.5 / BTTS**: Market prediction accuracy
- **Exact Score Hits**: Perfect score predictions
- **Trend Graph**: Accuracy progression over tournament days

---

## 🏆 Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 3.4 |
| **Data Fetching** | SWR (stale-while-revalidate) with smart refresh intervals |
| **AI Analysis** | Groq Llama 3.3 70B (narrative only — numbers from math) |
| **Data API** | API-Football (free tier) |
| **Database** | Supabase PostgreSQL (optional, primary in production) |
| **Fallback** | File-based JSON store (`lib/file-store.ts`) |
| **CI/CD** | GitHub Actions + Vercel |
| **Scheduling** | GitHub Actions cron (Vercel Hobby limitation) |

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx              # 📊 Dashboard (reordered v2)
│   ├── fixture/page.tsx      # ⚡ Predicción (4 tabs)
│   ├── live/page.tsx         # 📈 En Vivo (3 tabs)
│   ├── benchmark/page.tsx    # 🤖 Benchmark
│   └── api/                  # API routes
├── components/
│   ├── Top8Ranking.tsx       # Champion probability bars
│   ├── ChampionConsensusCard.tsx  # Multi-model consensus
│   ├── BracketPhase.tsx      # Knockout bracket display
│   └── ...                   # 20+ total components
├── lib/
│   ├── predictor-engine.ts   # Poisson + Dixon-Coles + Elo
│   ├── enhanced-engine.ts    # v2 with momentum, fatigue, altitude
│   ├── ensemble-engine.ts    # v3: 4-model blend
│   ├── tournament-sim.ts     # 100 Monte Carlo simulations
│   ├── prediction-store.ts   # Bayesian dynamic updating
│   ├── dashboard-utils.ts    # 🆕 date grouping, upcoming matches
│   ├── data-layer/           # Abstraction (in-memory ↔ Supabase)
│   ├── matches.ts            # 128 WC2026 matches
│   ├── teams.ts              # 48 teams with Elo, power ratings
│   └── venues.ts             # 16 venues with altitude data
├── lib/__tests__/            # 105 tests (10 files)
│   ├── dashboard-utils.test.ts  # 🆕 6 tests for dashboard utils
│   └── ...
├── supabase/migrations/
│   └── 001_initial_schema.sql
└── scripts/
    └── ...
```

---

## 🔑 Key Features

- **Zero hardcoded data** — everything computed from statistics
- **Timezone aware** — all times converted to user's local timezone
- **Responsive** — mobile, tablet, desktop with sidebar navigation
- **Dark theme** — FORCH.i gold (#C9A227) accent color
- **All UI in Spanish**
- **Third-place uniqueness** — each third-place team appears exactly once in R32
- **Prediction drift tracking** — shows how much predictions changed after each result
- **Auto-recalculate** — after each real result, entire bracket re-simulates
- **Evolución de Precisión** — accuracy trend chart showing improvement over tournament days
- **ORACLE vs Modelos** — compare ORACLE predictions against 10 benchmark AI models
- **Predicción Drift** — visual comparison of predicted vs real scores with MAE color coding
- **Auto-refresh inteligente** — 2min during match windows, 30min otherwise (via SWR)
- **Instant panel switching** — SWR cache shows data instantly when switching tabs
- **Partido del Día** — highlighted upcoming match with most balanced prediction
- **Próximos Partidos** — next 4 upcoming matches with predictions
- **Resultados por fecha** — results grouped by day with accuracy badges per day
- **Campeón del Mundo widget** — Top 8 champion probabilities, auto-adjusts with real results
- **En Vivo mejorado** — live badge, elapsed time, goalscorers
- **Motion animations** — smooth entrance animations via motion/react (Framer Motion)
- **Skeleton loading** — smooth skeleton screens instead of spinners
- **Empty states amigables** — contextual messages with emojis when no data

---

## 📄 Documentation

- [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) — Step-by-step Supabase setup guide
- [`USER_GUIDE.md`](USER_GUIDE.md) — User guide for all panels
- [`AGENTS.md`](AGENTS.md) — Developer/agent instructions
- [`CONTEXT.md`](CONTEXT.md) — Project context and domain language

---

*FORCH.i © 2026 · Built with FORCH.i by Paulo Velasco · Datos oficiales FIFA · WC2026*
