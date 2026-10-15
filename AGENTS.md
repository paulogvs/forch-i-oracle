# FORCH.i ORACLE — Agent Instructions

## Tech Stack
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3.4
- **AI:** Groq Llama 3.3 70B
- **Data:** API-Football (free tier)

## Scripts
- `npm run dev` — Development server
- `npm run build` — Production build
- `npm start` — Production server

## Architecture

### Data Layer (Abstraction)
- `lib/data-layer/` — Pluggable data layer (in-memory + file-store)
  - `interface.ts` — IDataLayer interface (contract)
  - `in-memory.ts` — In-memory implementation (default, auto-seeds)
  - `index.ts` — Factory (always in-memory)
  - `types.ts` — Shared TypeScript types

### Prediction Engines
- `lib/predictor-engine.ts` — Core Poisson + Elo + xG engine (v1, stable)
- `lib/prediction-store.ts` — Bayesian-updating living engine
- `lib/enhanced-engine.ts` — Enhanced engine (v2) with:
  - xG ajustado por competición
  - Momentum con pesos exponenciales
  - Fatiga (días entre partidos)
  - Home advantage realista WC2026
  - Impacto de lesiones ponderado
  - H2H histórico ponderado
  - Data quality scoring

### Cron Jobs (Vercel Cron)
- `/api/cron/ingest` — Ingesta de datos (cada 6h)
- `/api/cron/recalculate` — Recalcular predicciones (cada 12h)
- `/api/cron/simulate` — Simulación de torneo (diario)
- `/api/cron/status` — Status de todos los jobs

### API Routes
- `POST /api/predict` — Single match prediction (v2, uses data layer)
- `POST /api/simulate-tournament` — Full tournament simulation (persisted)
- `POST /api/fixture` — All 128 match predictions (enhanced engine)
- `POST /api/match-result` — Submit real result → cascade update
- `GET /api/predictions/all` — All pre-calculated predictions
- `GET /api/prediction/[matchId]` — Single pre-calculated prediction

## Components (15 files)
- `components/layout/AppShell.tsx` — App shell (sidebar + mobile nav + topbar)
- `components/layout/TopBar.tsx` — Fixed top bar with refresh
- `components/ui/Badge.tsx` — Status badge primitive
- `components/ui/Button.tsx` — Button primitive
- `components/ui/LiveDot.tsx` — Live status dot
- `components/ui/ScrollReveal.tsx` — Intersection observer reveal
- `components/ui/Surface.tsx` — Styled container primitive
- `components/icons/animated-icons.tsx` — 7 animated SVG icons
- `components/system/AutoSync.tsx` — Background data sync worker
- `components/BackToTop.tsx` — Scroll-to-top button
- `components/DriftSparkline.tsx` — Prediction drift sparkline chart
- `components/MatchSeal.tsx` — Match verification stamp
- `components/ModelDisagreementCard.tsx` — Ensemble model agreement display
- `components/Skeleton.tsx` — Loading skeleton variants
- `components/VerdictCard.tsx` — Prediction vs reality verdict

> Note: Many sub-components are defined inline in page files (e.g., `fixture/page.tsx` has ~10 inline components).

### Pages (7 routes)
- `/` — Dashboard (home)
- `/fixture` — Full fixture viewer (groups, bracket, top8)
- `/live` — Live panel (results, upcoming)
- `/stats` — Statistics dashboard
- `/teams` — Team browser
- `/backtest` — Model validation
- `/forecast` and `/torneo` — Redirects to `/fixture`

## Data Files
- `lib/matches.ts` — 128 WC2026 matches (72 group + 56 knockout)
- `lib/teams.ts` — 48 World Cup teams with Elo, power ratings, star players
- `lib/venues.ts` — 16 WC2026 venues with altitude data
- `lib/h2h.ts` — 50+ historical head-to-head records

## Conventions
- Use `'use client'` for interactive components
- Lazy-initialize API clients (don't evaluate at module level)
- Use FORCH.i gold (#C9A227) for accents
- Include "Built with FORCH.i by Paulo Velasco" badge
- Data layer: always use `getDataLayer()` — don't import implementations directly
- Enhanced engine: prefer `calculateEnhancedPrediction` over base engine for new features
- All predictions: 100% statistical (Poisson + Elo + xG + Bayesian ensemble) — no AI/LLM calls

## API Keys Required
- `FOOTBALL_API_KEY` — API-Football (https://www.api-football.com/)

## Optional (for cron job protection)
- `CRON_SECRET` — Secret for protecting cron endpoints
