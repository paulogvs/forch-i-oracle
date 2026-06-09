---
name: nextjs-ai-app-review
description: Systematic review checklist for Next.js apps that integrate external APIs + AI (Gemini/OpenAI) for predictions or analysis
source: auto-skill
extracted_at: '2026-06-09T15:47:38.026Z'
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

### Prompt & Response Handling
- **JSON parsing**: AI responses often include markdown code fences. Verify the parser strips ````json` and ```` gracefully, with regex fallback for embedded JSON.
- **Value validation**: Probabilities should be clamped to 0–100 and checked for NaN before use.
- **Error mapping**: Different AI failure modes (quota exceeded, safety blocked, invalid key) should map to distinct HTTP status codes and user-facing messages.

### Grounding / Tool Use
- If the AI model supports grounding (e.g., `googleSearchRetrieval`), verify the prompt instructs it to search for *current* data, not rely on training data.

## 3. API Routes (app/api/*/route.ts)

- **IP extraction**: `x-forwarded-for` can contain multiple IPs; the first is the real client. Verify parsing.
- **Non-critical API failures**: External data APIs (sports stats, weather, etc.) should be wrapped in try/catch — the AI can still generate predictions with fallback context.
- **Error detail exposure**: In production, `details` should only be included when `NODE_ENV === 'development'`.

## 4. Frontend Components

### State Management
- **Client vs Server**: Only interactive portions need `'use client'`. Static header/footer/background should be server-rendered for better initial paint.
- **Dropdown disabling UX**: Disabling an entire selector because the other has a value is hostile. Instead, filter out the already-selected option from the dropdown options.

### Data Flow
- **Loading states**: Async operations should have visible loading indicators at every step (search, prediction, data fetch).
- **Error display**: Errors should be contextual (which step failed) and actionable (what the user should do).

## 5. Data Files (lib/matches.ts, lib/teams.ts, etc.)

- **Completeness checks**: Tournament brackets have fixed structures. Verify: Round of 16 = 8 matches, Quarter-finals = 4, etc.
- **TBD handling**: Matches with undetermined teams should be visually disabled AND excluded from actionable operations.
- **Import placement**: All imports should be at the top of the file, not interleaved with helper functions.

## 6. Tests

- **Test real functions, not re-implementations**: Tests should `import` and call the actual exported functions, not duplicate the logic inline.
- **Test isolation**: Rate limiter tests using fixed IPs can be flaky if module state persists between test runs. Use unique prefixes per test or mock the Map.
- **Coverage priority**: Test the most complex modules first (data fetching, API routes), not just the simplest data files.

## 7. Configuration

- **Env var safety**: `process.env.*` should be validated at startup or typed with Zod/t3-env, not accessed ad-hoc in functions.
- **Unused theme values**: Check Tailwind config for defined colors/sizes that are never used — they indicate incomplete work or dead code.
- **Security headers**: Verify both `vercel.json` and `next.config.mjs` aren't duplicating headers (Next.js `headers()` takes precedence for matched routes).
