# FORCH.i ORACLE — Implementation Plan

> Last updated: 2026-07-16
> Status: Active development — Phase 1 (Stability) in progress

## Current State

- **Prediction Engine:** 4-layer ensemble (Poisson+Elo → Enhanced v2 → Bayesian → Ensemble v3) ✅
- **Tournament Simulation:** 5000 Monte Carlo sims, FIFA tiebreakers, bracket DAG ✅
- **Data Layer:** In-memory + file-store, 40+ methods ✅
- **UI:** 7 pages, 15 components ✅
- **API:** 20 endpoints ✅
- **Cron Jobs:** 4 jobs (ingest/recalculate/simulate/status) ✅
- **Tests:** 422 tests across 14 files — all critical modules now covered ✅

---

## Phase 1 — Stability (Tests + Planning)

| # | Task | Status | Priority | Est. |
|---|------|--------|----------|------|
| 1.1 | Create PLAN.md | ✅ DONE | CRITICAL | 30 min |
| 1.2 | Tests: ensemble-engine.ts | ✅ DONE (27 tests) | CRITICAL | 2h |
| 1.3 | Tests: tournament-sim.ts | ✅ DONE (39 tests) | CRITICAL | 3h |
| 1.4 | Tests: data-layer/in-memory.ts | ✅ DONE (72 tests) | CRITICAL | 2h |
| 1.5 | Tests: enhanced-engine.ts | ✅ DONE (102 tests) | HIGH | 2h |
| 1.6 | Tests: prediction-store.ts | ✅ DONE (53 tests) | HIGH | 1.5h |
| 1.7 | Tests: cron jobs (4 endpoints) | ✅ DONE (35 tests) | MEDIUM | 2h |

## Phase 2 — Code Quality (Refactoring)

| # | Task | Status | Priority | Est. |
|---|------|--------|----------|------|
| 2.1 | Extract fixture/page.tsx sub-components to standalone files | ⏳ PENDING | HIGH | 4h |
| 2.2 | Integrate i18n in all pages (replace hardcoded strings) | ⏳ PENDING | MEDIUM | 3h |
| 2.3 | Update AGENTS.md with real component list | ⏳ PENDING | LOW | 30 min |

## Phase 3 — New Features

| # | Task | Status | Priority | Est. |
|---|------|--------|----------|------|
| 3.1 | Live scores via API-Football integration | ⏳ PENDING | HIGH | 4h |
| 3.2 | SQLite/Postgres data layer implementation | ⏳ PENDING | HIGH | 6h |
| 3.3 | Push notifications for live goals | ⏳ PENDING | MEDIUM | 3h |
| 3.4 | Model disagreement UI (4-model comparison) | ⏳ PENDING | MEDIUM | 3h |
| 3.5 | Prediction drift history UI | ⏳ PENDING | MEDIUM | 2h |

## Phase 4 — Deployment & Polish

| # | Task | Status | Priority | Est. |
|---|------|--------|----------|------|
| 4.1 | GitHub Actions CI (lint + test + build) | ⏳ PENDING | HIGH | 2h |
| 4.2 | PWA with service worker | ⏳ PENDING | MEDIUM | 2h |
| 4.3 | Performance optimization (lazy loading, code splitting) | ⏳ PENDING | MEDIUM | 3h |
| 4.4 | SEO optimization (meta tags, structured data) | ⏳ PENDING | LOW | 1h |

---

## Test Coverage Summary

| Module | Tests | Status |
|--------|-------|--------|
| predictor-engine.ts | 9 | ✅ |
| poisson-dixon-coles.ts | 18 | ✅ |
| benchmark-scoring.ts | 25 | ✅ |
| teams.ts | 12 | ✅ |
| matches.ts | 13 | ✅ |
| rate-limit.ts | 6 | ✅ |
| dashboard-utils.ts | 6 | ✅ |
| predict-route.test.ts | 5 | ✅ |
| ensemble-engine.ts | 27 | ✅ NEW |
| tournament-sim.ts | 39 | ✅ NEW |
| data-layer/in-memory.ts | 72 | ✅ NEW |
| enhanced-engine.ts | 102 | ✅ NEW |
| prediction-store.ts | 53 | ✅ NEW |
| cron jobs | 35 | ✅ NEW |
