---
name: third-place-uniqueness-in-bracket
description: Ensure each third-place team appears in exactly one Round of 32 match by tracking used teams with a Set — prevents duplicate matchups like "vs CHEQUIA" appearing 4 times
source: auto-skill
extracted_at: '2026-06-12T00:30:00.000Z'
---

## Third-Place Uniqueness in Knockout Brackets

### The Problem

In a 48-team World Cup with 12 groups, the 8 best third-place teams advance to the Round of 32. Each third-place slot has a criteria like `3B/3E/3F/3G` (best third-place from groups B, E, F, or G).

**Bug:** If you resolve each slot by returning the first match from the criteria, all 8 third-place slots return the SAME team (the #1 ranked third-place team). This causes:
- "Chequia vs Brasil", "Chequia vs Suiza", "Chequia vs Países Bajos" — all in R32
- Only 8 unique teams instead of 16 in R32
- Bracket breaks downstream

### The Solution

Use a `Set<string>` to track which third-place teams have been assigned, ensuring each appears exactly once:

```typescript
const usedThirdPlaces = new Set<string>();

const getThirdPlace = (slot: string): string => {
  // Parse group letters from slot: "3B/3E/3F/3G" → ['B', 'E', 'F', 'G']
  const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];

  // Find the best third-place whose group matches AND hasn't been used
  for (const tp of qualified.bestThirdPlaces) {
    const tpInfo = qualified.thirdPlaceGroups.find(t => t.name === tp);
    if (tpInfo && groupLetters.includes(tpInfo.group) && !usedThirdPlaces.has(tp)) {
      usedThirdPlaces.add(tp);
      return tp;
    }
  }

  // Fallback: any unused best third-place
  for (const tp of qualified.bestThirdPlaces) {
    if (!usedThirdPlaces.has(tp)) {
      usedThirdPlaces.add(tp);
      return tp;
    }
  }

  return 'TBD';
};
```

### QualifiedTeams Interface

```typescript
interface QualifiedTeams {
  groupWinners: Map<string, string>;
  groupRunnersUp: Map<string, string>;
  bestThirdPlaces: string[];               // Top 8 third-place team names
  groupStandings: Record<string, any[]>;   // Full standings per group
  thirdPlaceGroups: { name: string; group: string }[]; // Maps team → their group
}
```

The `thirdPlaceGroups` field is critical — it maps each third-place team name to the group they came from, enabling the criteria matching.

### Usage in R32 Loop

```typescript
for (const slot of r32Slots) {
  // Home: if it's a third-place slot (contains '3'), use getThirdPlace
  const home = slot.home.includes('3')
    ? getThirdPlace(slot.home)
    : resolveTeamSlot(slot.home, qualified, winners, losers);

  // Away: same logic
  const away = slot.away.includes('3')
    ? getThirdPlace(slot.away)
    : resolveTeamSlot(slot.away, qualified, winners, losers);

  // ... predict match, store winner
}
```

### Verification

After resolution, verify uniqueness:

```typescript
const teamsInR32 = new Set<string>();
for (const m of bracket.roundOf32) {
  if (m.homeTeam && m.homeTeam !== 'TBD') teamsInR32.add(m.homeTeam);
  if (m.awayTeam && m.awayTeam !== 'TBD') teamsInR32.add(m.awayTeam);
}
console.log(`Unique teams in R32: ${teamsInR32.size}/32`);
// Should be at least 16+ for a valid bracket
```

### When to Use

- Any tournament bracket with third-place advancement (World Cup 48-team format)
- When resolving slot criteria that reference multiple groups
- Whenever you need to assign entities from a ranked pool to multiple slots without duplication
