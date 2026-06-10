---
name: nextjs-ai-app-review
description: Systematic review checklist for Next.js apps that integrate external APIs + AI (Gemini/OpenAI) for predictions or analysis
source: auto-skill
extracted_at: '2026-06-09T16:12:00.000Z'
---

# Next.js + AI App Review Checklist

When reviewing a Next.js app that combines external data APIs with AI model calls (e.g., Gemini for sports predictions), follow this layered approach:

## 1. Data Fetching Layer (lib/*.ts)

### API Client Logic
- **Form/form tracking**: Verify the logic correctly tracks *the queried entity's* results, not just one side. Common bug: always checking `home.winner` instead of correlating with the team being queried.
- **H2H / matchup endpoints**: Ensure the code correlates which team was home/away in each fixture before declaring W/L/D. Check that score parsing reads from the correct response field.
- **Name mapping**: If the app translates display names to API names (e.g., Spanish → English), check for a single source of truth. Duplicate mappings between files cause drift.
- **Graceful degradation**: API keys may be missing in dev — verify `null` fallbacks exist and don't crash.

### Rate Limiting
- **Serverless awareness**: In-memory `Map`-based rate limiters reset on every cold start in Vercel/AWS Lambda. They only work in long-running processes. Flag if production durability is needed (Upstash Redis, KV, etc.).

## 2. AI Integration Layer

### Model Availability & SDK Compatibility
- **Model names change**: AI providers deprecate and rename models. `gemini-1.5-flash` was deprecated (404 Not Found) and replaced by `gemini-2.0-flash`. Always verify the model exists at runtime.
- **SDK version matters**: In `@google/generative-ai` 0.21.0, `generateContent` accepts a string prompt directly. The `tools` config syntax varies by SDK version — `googleSearchRetrieval` in `generateContent` vs `googleSearch` in `getGenerativeModel`. Match the SDK's expected format.
- **Test against the SDK you ship**: Don't assume API call formats from documentation apply to your installed version.

### Prompt & Response Handling
- **JSON parsing**: AI responses often include markdown code fences. Verify the parser strips ````json` and ```` gracefully, with regex fallback for embedded JSON.
- **Value validation**: Probabilities should be clamped to 0–100 and checked for NaN before use.
- **Error mapping**: Different AI failure modes (quota exceeded, safety blocked, invalid key, model not found) should map to distinct HTTP status codes and user-facing messages.

### Grounding / Tool Use
- If the AI model supports grounding (e.g., `googleSearchRetrieval`), verify the prompt instructs it to search for *current* data, not rely on training data.

## 3. API Routes (app/api/*/route.ts)

- **IP extraction**: `x-forwarded-for` can contain multiple IPs; the first is the real client. Verify parsing.
- **Non-critical API failures**: External data APIs (sports stats, weather, etc.) should be wrapped in try/catch — the AI can still generate predictions with fallback context.
- **Error detail exposure**: In production, `details` should only be included when `NODE_ENV === 'development'`.
- **Generic error messages are debugging blockers**: The catch-all error message must include enough context (or logs) to identify the root cause. Always log `error.stack` and `error.cause` in production logs.

## 4. Frontend Components

### State Management
- **Client vs Server**: Only interactive portions need `'use client'`. Static header/footer/background should be server-rendered for better initial paint.
- **Dropdown disabling UX**: Disabling an entire selector because the other has a value is hostile. Instead, filter out the already-selected option from the dropdown options.

### Data Flow
- **Loading states**: Async operations should have visible loading indicators at every step (search, prediction, data fetch).
- **Error display**: Errors should be contextual (which step failed) and actionable (what the user should do).

## 5. Data Files (lib/matches.ts, lib/teams.ts, etc.)

- **Completeness checks**: Tournament brackets have fixed structures. Verify: Round of 16 = 8 matches, Quarter-finals = 4, etc. Also verify **every group has exactly N*(N-1)/2 matches** (e.g., 6 for a 4-team group). Incomplete groups break simulations.
- **TBD handling**: Matches with undetermined teams should be visually disabled AND excluded from actionable operations.
- **Import placement**: All imports should be at the top of the file, not interleaved with helper functions.
- **Cross-file data consistency (CRITICAL)**: When team-group assignments exist in multiple files (e.g., `teams.ts` and `matches.ts`), they **will drift**. The simulation engine reads from one source while the UI reads from another, producing contradictory group tables vs. match lists. **Pick one file as the single source of truth** for team→group mapping and derive everything else from it. Add a build-time assertion or test that cross-references both files.
- **Stale naming after tech migration**: When a LLM backend changes (e.g., Gemini → Groq), verify that file names (`gemini.ts` → `groq.ts`), function names (`parseGeminiJson`), comments, and documentation (`CONTEXT.md`, `package.json` description) are all updated. Leftover references confuse future developers and reviewers.
- **Power rating deduplication**: If a simulation uses team names as keys in a rating/power map, ensure there are no duplicate entries for the same team under different names (e.g., `'Cameroon': 65, 'Camerún': 65`). This masks normalization bugs — the code should map both to a single canonical name.
- **Star player accuracy**: Verify star players belong to the correct national team. Cross-reference with a reliable source. (Found: Iraq listed Sardar Azmoun, who is Iranian.)
- **`isPlayed` field lifecycle**: If a `SimulatedMatch` has an `isPlayed` boolean, verify it actually transitions from `false` to `true` somewhere in the code. A field that never changes is dead state and misleads consumers.
- **Separate cache systems**: If the app has a shared cache module (`lib/cache.ts`) but also declares ad-hoc caches in individual API routes (e.g., `tournament-simulation/route.ts` with its own `Map`), consolidate them. Duplicated cache logic leads to inconsistent TTLs and stale data.

## 6. Tests

- **Test real functions, not re-implementations**: Tests should `import` and call the actual exported functions, not duplicate the logic inline.
- **Test isolation**: Rate limiter tests using fixed IPs can be flaky if module state persists between test runs. Use unique prefixes per test or mock the Map.
- **Coverage priority**: Test the most complex modules first (data fetching, API routes), not just the simplest data files.

## 7. Configuration

- **Env var safety**: `process.env.*` should be validated at startup or typed with Zod/t3-env, not accessed ad-hoc in functions.
- **Unused theme values**: Check Tailwind config for defined colors/sizes that are never used — they indicate incomplete work or dead code.
- **Security headers**: Verify both `vercel.json` and `next.config.mjs` aren't duplicating headers (Next.js `headers()` takes precedence for matched routes).

## 8. Production Debugging (Vercel/Serverless)

- **When the user reports a generic error**: The first step is to check Vercel logs, not guess. Generic error messages ("Error generating prediction") hide the real cause. Always check the server-side logs for the actual error message and stack trace.
- **Common Vercel-only failures**: Cold start import failures, environment variable misconfiguration, model/API deprecation, SDK version incompatibility. These won't show up in local dev.
