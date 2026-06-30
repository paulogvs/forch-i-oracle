# FORCH.i ORACLE — Full Review Report

> **@forchi 8-Phase Full Review** — 2026-06-17
> **Mode:** 🔵 PROJECT (full power, ecosystem as reference)
> **Build:** ✅ `next build` passes — lint ✅, tsc ✅, no errors
> **Stack:** Next.js 14 (App Router) · TypeScript strict · Tailwind 3.4 · SWR · Zustand · Groq Llama 3.3 · API-Football

---

## 📊 Executive Summary

| Dimension | Grade | Key Issue |
|-----------|-------|-----------|
| **Architecture** | B | Clean layered design, but fixture page (41KB) is monolithic; prediction engines well-structured |
| **Dead Code** | C | 12 dead components + 3 dead lib files + 2 redirect-only routes = ~25KB wasted |
| **Security** | D | 3 CRITICAL: unauthenticated match-result, CRON_SECRET in URLs, API key leak in response |
| **Design System** | C | Good token foundation, but 100+ hardcoded hex colors bypass it (breaks light mode) |
| **Accessibility** | D | Sparse ARIA, modal without dialog/focus-trap, Framer Motion ignores reduced-motion |
| **Performance** | C | Module-level Maps grow unbounded; /api/fixture cold-start = 128 ensemble predictions |
| **Type Safety** | A | Strict TypeScript, no errors, good separation |

**Overall: C+** — Functional and builds clean, but has significant security holes, design token violations, and accessibility gaps that should be addressed before production.

---

## 🔴 CRITICAL Issues (Must Fix)

### 1. POST /api/match-result — Completely Unauthenticated
- **File:** `app/api/match-result/route.ts`
- **Risk:** Anyone can submit fabricated match results → cascading corruption of predictions, forms, tournament simulation
- **Fix:** Add `validateCronAuth()` or admin auth. Restrict to cron/admin only.

### 2. CRON_SECRET Leaked via URL Query Parameters
- **Files:** `lib/cron-auth.ts`, `app/api/admin/ingest/route.ts`, `app/api/cron/ingest/route.ts`, `app/api/cron/recalculate/route.ts`
- **Risk:** URL params appear in logs, browser history, referrer headers
- **Fix:** Remove URL-param acceptance from `cron-auth.ts`. Use only `Authorization: Bearer <secret>` header. Change admin endpoints to POST-only (remove GET handlers). Change internal cron-to-cron calls to use Bearer header.

### 3. API Key Prefix Leaked in Diagnostic Response
- **File:** `app/api/cron/ingest/route.ts` (line ~256)
- **Risk:** `apiKey.slice(0, 6)` narrows key search space significantly
- **Fix:** Replace with boolean: `apiKey ? 'configured' : 'not set'`. Never expose any key portion.

### 4. 100+ Hardcoded Hex Colors Bypass Design Tokens
- **Files:** `app/fixture/page.tsx` (60+), `app/page.tsx` (15+), `app/live/page.tsx` (10+), `components/Top8Ranking.tsx` (2)
- **Risk:** These colors DO NOT respond to light-mode toggle. Match cards, result cards, and live status indicators remain dark-themed in light mode → jarring visual mismatch.
- **Fix:** Map all hardcoded states to CSS variables (e.g., `--match-correct-bg`, `--match-wrong-border`) defined in `globals.css` with light-mode overrides. Replace `bg-[#052E16]` with `bg-tint-green` or custom semantic tokens.

---

## 🟠 HIGH Issues (Should Fix)

### 5. 9 Public API Routes Without Rate Limiting
- Only `/api/predict` has rate limiting (10 req/min/IP). `/api/fixture` (most expensive — 128 ensemble predictions), `/api/live-scores` (outbound API calls), and 7 others are unprotected.
- **Fix:** Apply `checkRateLimit()` from `lib/rate-limit.ts` to `/api/fixture`, `/api/live-scores`, `/api/predictions/all`.

### 6. In-Memory Rate Limiter Ineffective on Serverless
- `lib/rate-limit.ts` uses module-level Map → resets on every Vercel cold start. An attacker bypasses by triggering cold starts.
- **Fix:** For production, use Vercel KV or Upstash Redis. Current approach is fine for dev.

### 7. Module-Level Maps Grow Indefinitely (Memory Leak Risk)
- 7 data-layer Maps, `rateLimit` Map, `predictionCache`/`apiCache` (lazy TTL eviction only), `fixtureCache` (uncapped) — all grow without bounds on warm lambda instances.
- **Fix:** Add maxSize caps, periodic cleanup sweep for expired cache entries, upper bounds on `matchResultsStore`.

### 8. /api/fixture Cold-Start Recomputes 128 Ensemble Predictions
- Module-level `fixtureCache` Map resets on every Vercel cold start → virtually every production request is a cache miss.
- **Fix:** Use Vercel KV or edge caching. Increase parallelization (Promise.all batching). Consider pre-warming via cron.

### 9. Framer Motion Ignores `prefers-reduced-motion`
- CSS zeroes animation durations, but `motion.*` elements continue animating. No `useReducedMotion()` hook used anywhere.
- **Fix:** Add `useReducedMotion()` check in all animated components and pages. Disable motion animations when reduced-motion is preferred.

### 10. Fixture Modal Lacks Dialog ARIA + Focus Trap
- `app/fixture/page.tsx` match detail modal: no `role="dialog"`, no `aria-modal`, no `aria-label`, no focus trap.
- **Fix:** Add dialog ARIA attributes and focus trap (use `focus-trap` package or manual implementation).

---

## 🟡 MEDIUM Issues (Should Address)

### 11. Cascading Cron Calls Can Exceed 60s Limit
- `/api/cron/ingest` → `/api/cron/recalculate` → `/api/cron/simulate` chain. Total duration can exceed Vercel Pro 60s limit. `/simulate` runs twice (from ingest AND recalculate).
- **Fix:** Break the chain. Schedule recalculate/simulate as separate Vercel Cron triggers after ingest.

### 12. CSP Allows `unsafe-eval` + `unsafe-inline`
- `next.config.mjs` CSP: `script-src 'self' 'unsafe-eval' 'unsafe-inline'` — significantly weakens XSS protection.
- **Fix:** Use nonce-based CSP (Next.js supports this). Remove `unsafe-inline`. Keep `unsafe-eval` only for dev mode.

### 13. No CORS Restriction on API Routes
- Any third-party website can call API routes directly.
- **Fix:** Add `Access-Control-Allow-Origin` header in `vercel.json` restricted to app domain.

### 14. /tmp File Store Ephemeral on Vercel + Silent Write Failures
- File store writes to `/tmp` (ephernal between deployments) and silently ignores write errors.
- **Fix:** Add logging when writes fail. Consider Vercel KV for production persistence.

### 15. /api/live-scores No Server-Side Caching
- Calls worldcup26.ir on every request with no cache. SWR polls every 30s → hundreds of outbound requests per minute with multiple users.
- **Fix:** Add 30-60s server-side cache using existing `apiCache` from `lib/cache.ts`.

### 16. Duplicate Security Headers in next.config.mjs + vercel.json
- Both define `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`. Can cause conflicts.
- **Fix:** Consolidate into `vercel.json` only (applied at edge before Next.js).

### 17. Sparse ARIA Coverage
- Only 14 aria attributes across entire codebase. Tab buttons lack `aria-selected`, expand/collapse buttons lack `aria-label`, theme toggle lacks `aria-label`, language selector lacks `aria-label`.
- **Fix:** Add ARIA attributes to all interactive elements. Use `aria-live="polite"` for dynamic content (live scores).

### 18. No Tablet Layout (768-1023px)
- Sidebar hidden at <1024px, bottom nav shown. Between 768-1023px, layout is identical to mobile.
- **Fix:** Add a tablet breakpoint (`md2: 900px` or use `lg` differently) for a compact sidebar or side drawer.

### 19. 12 Dead/Unused Components (~25KB)
| Component | Size | Status |
|-----------|------|--------|
| `FixtureView.tsx` | 3,874 B | Never imported by any page |
| `ComparisonBars.tsx` | 2,083 B | No import anywhere |
| `FormBubbles.tsx` | 1,082 B | No import anywhere |
| `GroupTable.tsx` | 5,764 B | No import anywhere |
| `LensConsensus.tsx` | 6,987 B | No import anywhere |
| `BracketPhase.tsx` | 2,944 B | Only via dead FixtureView |
| `ChampionPodium.tsx` | 1,381 B | Only via dead FixtureView |
| `GroupCard.tsx` | 2,231 B | Only via dead FixtureView |
| `Top8Ranking.tsx` | 6,044 B | Only via dead FixtureView |
| `ui/AnimatedNumber.tsx` | 1,416 B | No import anywhere |
| `ui/ProbabilityBar.tsx` | 1,779 B | No import anywhere |
| `ui/Skeleton.tsx` | 388 B | Duplicate of components/Skeleton.tsx |

### 20. 3 Dead Lib Files
| File | Size | Status |
|------|------|--------|
| `forecast-engine.ts` | 14,413 B | Forecast page removed, never imported |
| `events/data-events.ts` | 219 B | Zero consumers |
| `types/fixture.ts` | 370 B | Never imported; pages duplicate the type locally |

---

## 🔵 LOW Issues (Nice to Fix)

### 21. Duplicate Poisson Math in 3 Files
- `predictor-engine.ts`, `prediction-store.ts`, `ensemble-engine.ts` each have local `poissonPMF()`. Canonical is in `poisson-dixon-coles.ts`.
- **Fix:** Centralize in `poisson-dixon-coles.ts`, import from there.

### 22. Type Name Collisions
- `MatchResult`: different shapes in `enhanced-engine.ts` vs `prediction-store.ts`
- `RealTeamStats`: different shapes in `predictor-engine.ts` vs `football-api.ts`
- **Fix:** Unify or use distinct names.

### 23. `prediction-store.ts` Misnamed
- Actually the Bayesian Dynamic Engine, not a "store". Name suggests persistence but it's purely in-memory computation.
- **Fix:** Rename to `bayesian-engine.ts` or `dynamic-engine.ts`.

### 24. Two Skeleton Implementations
- `components/ui/Skeleton.tsx` (shimmer via CSS `.skeleton` class) vs `components/Skeleton.tsx` (pulse via `animate-pulse bg-elevated`).
- **Fix:** Consolidate into one. Remove `ui/Skeleton.tsx` if `components/Skeleton.tsx` is the canonical one.

### 25. Typography Scale Not in Tailwind Config
- CSS classes (`h-display`, `t-micro`, etc.) exist but aren't mapped to Tailwind `fontSize`.
- **Fix:** Add to `tailwind.config.ts` `fontSize` extension.

### 26. Border-radius Inconsistency
- Mixed usage: `rounded-lg`, `rounded-xl`, `rounded-[var(--r-lg)]`, `rounded-2xl`. Values differ (`xl` = 20px Tailwind default vs `--r-xl` = 24px CSS).
- **Fix:** Standardize on CSS variable references via Tailwind arbitrary values.

### 27. Mixed Surface Usage (CSS class vs React component)
- Some use `className="surface p-5"`, others use `<Surface variant="...">`.
- **Fix:** Standardize on `<Surface>` component for React files.

### 28. Button Shadow Colors Slightly Off from Tokens
- `primary` shadow: `rgba(43,127,255,0.25)` vs token `--accent-primary: #3B82F6` (59,130,246)
- `premium` shadow: `rgba(212,175,55,0.3)` vs token `--accent-premium: #E2B340`
- **Fix:** Use token-derived shadow colors.

### 29. `--text-disabled` Contrast Fails WCAG AA
- `#3A4350` on `#05070B` = ~2.1:1 ratio. Fails WCAG AA minimum 3:1.
- **Fix:** Increase `--text-disabled` brightness.

### 30. metadataBase Not Set
- Build warns: `metadataBase property not set for resolving social open graph or twitter images`.
- **Fix:** Add `metadataBase: 'https://forch-i-oracle.vercel.app'` to `app/layout.tsx` metadata.

### 31. SWR Fetchers Lack Timeout
- `jsonFetcher` and `postFetcher` have no AbortSignal timeout.
- **Fix:** Add `AbortSignal.timeout(30000)` to fetch calls.

### 32. Hardcoded Data in `enhanced-engine.ts`
- `HOST_COUNTRIES`, `TEAM_TIMEZONES`, continent lists, `VENUE_COORDS` duplicate data from `teams.ts` and `venues.ts`.
- **Fix:** Derive from canonical data sources.

---

## 📈 Positive Findings

| Area | What's Good |
|------|-------------|
| **Type Safety** | Strict TypeScript, no compilation errors, clean types |
| **Build** | Clean build, no lint errors, no type errors |
| **Client/Server Boundary** | Properly maintained — no server-only code leaked to client |
| **No Hardcoded Secrets** | All keys from env vars, .env.local.example has placeholders only |
| **SWR Configuration** | Good retry/backoff logic, smart refresh intervals, keepPreviousData |
| **Design Token Foundation** | 50+ CSS variables for colors, shadows, radii, motion — well-structured |
| **Prediction Engines** | 4-tier hierarchy (Elo deterministic → Poisson → Ensemble → Monte Carlo) — clean architecture |
| **No Circular Dependencies** | Strict layered dependency graph |
| **Security Headers** | CSP, HSTS, X-Frame-Options, X-Content-Type-Options present |
| **Cron Auth Module** | `cron-auth.ts` exists and is applied to cron routes |
| **PWA Manifest** | `app/manifest.ts` exists |
| **Error Boundaries** | Global + route-specific error boundaries |

---

## 📋 Recommended Priority Order

1. **🔴 CRITICAL:** Fix security holes (#1-3) — unauthenticated match-result, CRON_SECRET in URLs, API key leak
2. **🔴 CRITICAL:** Fix hardcoded colors (#4) — token migration for match states
3. **🟠 HIGH:** Add rate limiting (#5), fix ARIA (#9-10), fix reduced-motion (#9)
4. **🟡 MEDIUM:** Delete dead code (#19-20), break cron chain (#11), add caching (#15)
5. **🔵 LOW:** Consolidate duplicates (#21-28), fix type collisions (#22-23)

---

*Report generated by @forchi 8-Phase Protocol — Phase 8: LEARN*
