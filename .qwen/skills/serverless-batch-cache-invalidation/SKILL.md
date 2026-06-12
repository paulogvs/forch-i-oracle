---
name: serverless-batch-cache-invalidation
description: Replace sequential awaits with batched Promise.all and use Next.js revalidateTag for cache invalidation in serverless API routes
source: auto-skill
extracted_at: '2026-06-12T14:46:15.894Z'
---

## Problem
In Next.js serverless API routes (Vercel), sequential `await` inside loops causes:
1. **Slow response times** — each item waits for the previous one
2. **Stale cached responses** — after writing data, old cache entries aren't invalidated
3. **Timeout risks** — 128 items × 200ms each = 25+ seconds

## Solution: `batchProcess` utility + `revalidateTag`

### 1. Shared batch utility (`lib/utils.ts`)

```ts
export async function batchProcess<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 16
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    out.push(...await Promise.all(batch.map(fn)));
  }
  return out;
}
```

Why 16? Balances parallelism with:
- API rate limits (don't blast 100 concurrent requests)
- Serverless memory limits (each concurrent call uses RAM)
- Database connection pool limits

### 2. Use in API route (before → after)

**Before (sequential — slow):**
```ts
for (const match of affectedMatches) {
  try {
    await db.deletePrediction(match.id);
    const enhanced = await calculateEnhancedPrediction(/* ... */);
    await db.savePrediction({ /* ... */ });
    recalculated++;
  } catch { /* skip */ }
}
```

**After (batched — fast):**
```ts
import { batchProcess } from '@/lib/utils';

const recalcOne = async (match: { id: string; homeTeamId: string; awayTeamId: string }) => {
  await db.deletePrediction(match.id).catch(() => {});

  const [homeForm, awayForm] = await Promise.all([
    db.getTeamForm(match.homeTeamId),
    db.getTeamForm(match.awayTeamId),
  ]);

  const enhanced = await calculateEnhancedPrediction(/* ... */);
  await db.savePrediction({ /* ... */ });
  return true;
};

if (affectedMatches.length > 0) {
  const results = await batchProcess(affectedMatches, recalcOne, 16);
  recalculated = results.filter(Boolean).length;
}
```

### 3. Cache invalidation with `revalidateTag`

After writing data, invalidate Next.js caches so the next request gets fresh data:

```ts
import { revalidateTag } from 'next/cache';

export async function POST(request: NextRequest) {
  // ... process and save data ...

  // Invalidate all cached responses tagged with these keys
  revalidateTag('fixture');
  revalidateTag('tournament');

  return NextResponse.json({
    success: true,
    revalidated: ['fixture', 'tournament'],
    timestamp: new Date().toISOString(),
  });
}
```

**On the read side**, use `unstable_cache` with matching tags:

```ts
import { unstable_cache } from 'next/cache';

const getCachedFixture = unstable_cache(
  async (opts: { useEnhanced: boolean }) => {
    // ... expensive computation ...
    return { success: true, fixture: /* ... */ };
  },
  ['fixture-v1'],
  { revalidate: 300, tags: ['fixture', 'tournament'] }
);
```

When `revalidateTag('fixture')` is called, all cached responses with that tag are purged.

### Performance comparison

| Scenario | Sequential | Batched (16) |
|----------|-----------|--------------|
| 16 items | ~3.2s | ~0.4s |
| 64 items | ~12.8s | ~0.8s |
| 128 items | ~25.6s | ~1.6s |

*(Assuming ~200ms per item for DB read + compute + DB write)*

### When to adjust batch size

- **API rate limits**: Lower to 4-8
- **Database-heavy ops**: Lower to 4 (connection pool limits)
- **CPU-bound ops**: Can go higher (32-64) — no external I/O bottleneck
- **Memory-constrained serverless**: Keep at 8-16

### Pattern checklist

- [ ] Import `batchProcess` from shared utils
- [ ] Extract loop body into `const fn = async (item) => { ... }`
- [ ] Replace `for await` with `batchProcess(items, fn, 16)`
- [ ] Add `revalidateTag('...')` after writes
- [ ] Use `unstable_cache` with matching tags on reads
- [ ] Return `timestamp` in response so frontend can update UI
