---
name: timezone-aware-fixture-scheduling
description: Pattern for converting UTC match schedules to user-local timezone with automatic detection, preset selectors, and date regrouping so matches appear on the correct local day
source: auto-skill
extracted_at: '2026-06-11T18:34:08.349Z'
---

# Timezone-Aware Fixture Scheduling

When displaying match schedules stored in UTC to users in different timezones, the UTC date often differs from the local date (especially for late-night matches). A match at 02:00 UTC on June 12 is June 11 at 22:00 in Bolivia (UTC-4). Grouping by UTC date shows matches on the wrong day.

## The Problem

```
Match stored: { date: '2026-06-12', time: '02:00' } // UTC

For user in Bolivia (UTC-4):
  Local time: June 11 at 22:00 ← should appear on June 11, not June 12!

Without conversion:
  June 11 shows 1 match (México vs Sudáfrica)
  June 12 shows 2 matches (including Corea vs Chequia) ← WRONG

With conversion:
  June 11 shows 2 matches (both correct for local timezone)
  June 12 shows 1 match
```

## Solution: lib/timezone.ts

```ts
// lib/timezone.ts

/** Detect user's timezone offset from UTC in hours */
export function getUserTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60;
}

/** Get timezone label: UTC-4, UTC+1, etc. */
export function getTimezoneLabel(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  return `UTC${sign}${Math.abs(offset)}`;
}

/** Preset timezones for quick selection */
export const TIMEZONE_PRESETS = [
  { label: 'Bolivia', offset: -4 },
  { label: 'México CDMX', offset: -6 },
  { label: 'EE.UU. Este', offset: -5 },
  { label: 'EE.UU. Pacífico', offset: -8 },
  { label: 'España', offset: 1 },
  { label: 'Argentina', offset: -3 },
  { label: 'UTC', offset: 0 },
];

/** Convert UTC date/time to localized strings */
export function utcToLocal(dateStr: string, timeStr: string): {
  date: string;           // YYYY-MM-DD in local tz
  time: string;           // HH:MM in local tz
  display: string;        // "11 jun · 22:00"
  dayName: string;        // "jue"
  isDifferentDay: boolean; // true if local date ≠ UTC date
} {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcDate = new Date(Date.UTC(
    parseInt(dateStr.split('-')[0]),
    parseInt(dateStr.split('-')[1]) - 1,
    parseInt(dateStr.split('-')[2]),
    hours, minutes
  ));

  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const localTime = `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`;

  const display = utcDate.toLocaleDateString('es-MX', {
    day: 'numeric', month: 'short'
  }) + ` · ${localTime}`;

  const dayName = utcDate.toLocaleDateString('es-MX', { weekday: 'short' });

  // Compare UTC date string day with local date day
  const utcDay = dateStr.split('-')[2];
  const isDifferentDay = utcDay !== day;

  return { date: `${year}-${month}-${day}`, time: localTime, display, dayName, isDifferentDay };
}
```

## Integration Pattern — Fixture Page

### 1. Auto-detect timezone on mount

```tsx
const [tzOffset, setTzOffset] = useState<number>(-4); // sensible default

useEffect(() => {
  setTzOffset(getUserTimezoneOffset()); // auto-detect browser tz
  loadFixtures();
}, []);
```

### 2. Group matches by LOCAL date, not UTC

```tsx
// WRONG — groups by UTC date
const groupedByDate = fixtures.reduce((acc, m) => {
  if (!acc[m.date]) acc[m.date] = [];
  acc[m.date].push(m);
  return acc;
}, {});

// CORRECT — converts to local date first
const groupedByDate = fixtures.reduce((acc, m) => {
  const local = utcToLocal(m.date, m.time || '00:00');
  if (!acc[local.date]) acc[local.date] = [];
  acc[local.date].push({ ...m, time: local.time });
  return acc;
}, {});
```

### 3. Timezone selector in the UI

```tsx
<select
  value={tzOffset}
  onChange={(e) => setTzOffset(Number(e.target.value))}
  className="..."
>
  {TIMEZONE_PRESETS.map(tz => (
    <option key={tz.offset} value={tz.offset}>
      {tz.label} ({getTimezoneLabel(tz.offset)})
    </option>
  ))}
</select>
```

### 4. Show local time + "different day" badge

```tsx
const local = utcToLocal(match.date, match.time);

<div className="text-[10px] text-accent-blue/70">
  🕐 {local.display}
  {local.isDifferentDay && (
    <span className="text-[9px] text-accent-amber/80 bg-accent-amber/10 px-1 rounded">
      día diferente a UTC
    </span>
  )}
</div>
```

### 5. Show timezone label in date headers

```tsx
<h3>
  {formatDate(date)}
  <span className="text-text-muted">· {matches.length} partidos</span>
  <span className="ml-auto text-[10px] text-accent-gold/60">
    {currentTzLabel} {/* e.g., "UTC-4" */}
  </span>
</h3>
```

## Key Gotchas

| Issue | Solution |
|-------|----------|
| **Matches appear on wrong date** | Always convert UTC → local before grouping by date |
| **00:00–04:00 UTC matches** | These are always previous day for Americas; badge alerts user |
| **DST transitions** | `new Date().getTimezoneOffset()` handles DST automatically |
| **Server-side rendering** | `getTimezoneOffset()` is client-only; use a default (e.g., -4) and override in useEffect |
| **Sorting order** | After grouping by local date, sort matches within each group by local time |

## Testing

```ts
// Test: 02:00 UTC June 12 → 22:00 local June 11 (UTC-4)
const result = utcToLocal('2026-06-12', '02:00');
// Expected: { date: '2026-06-11', time: '22:00', isDifferentDay: true }

// Test: 19:00 UTC June 11 → 15:00 local June 11 (UTC-4)
const result = utcToLocal('2026-06-11', '19:00');
// Expected: { date: '2026-06-11', time: '15:00', isDifferentDay: false }
```
