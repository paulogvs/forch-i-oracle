---
name: graceful-api-error-handling
description: Never return 500 from API routes for recoverable errors — return graceful empty state with success:true so the frontend stays usable
source: auto-skill
extracted_at: '2026-06-12T15:30:00.000Z'
---

# Graceful API Error Handling in Next.js

## The Problem

API routes that throw 500 errors on any failure cause the frontend to show error states, toast notifications, and broken UI — even when the error is recoverable (e.g., no data yet, missing optional dependency).

## Anti-Pattern

```ts
// ❌ Returns 500 on any error — breaks the entire dashboard
export async function GET() {
  try {
    const db = await getDataLayerAsync();
    const allMatches = await db.getAllMatches(); // throws if db is null
    const predictions = await db.getPredictionsForMatches(allMatches.map(m => m.id));
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error', details: error.message },
      { status: 500 }
    );
  }
}
```

## Pattern: Return Graceful Empty State

```ts
// ✅ Returns 200 with sensible defaults — dashboard stays functional
export async function GET() {
  try {
    const data = await doActualWork();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('[route-name] Error:', error);

    // Return graceful empty state instead of 500
    return NextResponse.json({
      success: true,
      // Same shape as success response, but with defaults
      metricA: 0,
      metricB: [],
      totalCount: 0,
      message: 'Esperando datos para calcular',
    });
  }
}
```

## Rules

1. **Never return 500 for missing data** — data not being ready is not a server error, it's a valid state
2. **Always return the same response shape** — frontend should handle `0`/`[]`/`null`, not `{ error: ... }` vs `{ data: ... }`
3. **Wrap individual calls in try/catch** for non-critical data — don't let one failing sub-call kill the whole response
4. **Keep `success: true`** in the fallback — the route worked, it just has no data yet
5. **Log the error** with `console.error` for debugging, but don't expose internals to the client

## Nested Error Handling

```ts
// Critical: accuracy calculation
const [accuracy, comparisons, trend] = await Promise.all([
  calculateAccuracy(),
  getMatchComparisons(),
  calculateAccuracyTrend(),
]);

// Non-critical: prediction count (wrap individually)
let totalPredictions = 0;
try {
  const db = await getDataLayerAsync();
  const predictions = await db.getPredictionsForMatches(matchIds);
  totalPredictions = predictions.length;
} catch {
  // Non-critical — informational only
}

// Static fallback for count
const totalMatches = ALL_MATCHES.length;
```

## Frontend Impact

With graceful errors, the frontend can use simple defaults:

```tsx
// No need for separate error state handling
const { data } = useAccuracy();
// data?.winnerAccuracy ?? 0 → shows "0%"
// data?.matchesPlayed ?? 0 → shows "0"
```

Without graceful errors, the frontend needs:

```tsx
// Complex error handling for every hook
const { data, error } = useAccuracy();
if (error) { toast.error('No se pudo cargar...'); }
if (!data?.success) { /* handle error object shape */ }
```

## When to Actually Return 500

Return 500 only for **unrecoverable** errors:
- Malformed request body (400, not 500)
- Authentication failure (401)
- Rate limiting (429)
- Internal system broken that requires operator intervention (500)

Do NOT return 500 for:
- Empty database / no data yet
- External API down (use cached/stale data)
- Optional dependency missing (fall back gracefully)
- User data not found (return empty array/object)
