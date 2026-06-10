---
name: verify-official-sports-data
description: Systematically verify a sports prediction app's data (teams, groups, schedule, venues) against official federation sources using web_fetch, identify all discrepancies, and correct them in code
source: auto-skill
extracted_at: '2026-06-10T18:38:47.103Z'
---

# Verify Official Sports Data Against Federation Sources

When working with a sports prediction app that uses real-world data (teams, groups, schedules, venues), always verify the data against official federation sources before making changes or shipping updates.

## When to apply

- Before a major release or deployment
- When the user asks to "verify data" or "check for errors"
- When adding a new season/tournament that hasn't happened yet
- After importing data from third parties or AI-generated sources
- When the user suspects data may be wrong or outdated

## Step-by-step procedure

### 1. Identify the authoritative source

Find the official governing body's website or the most reliable public source:

| Sport | Official Sources |
|-------|-----------------|
| Football (World Cup) | FIFA.com, Wikipedia (2026 FIFA World Cup) |
| Football (Euro) | UEFA.com |
| Football (Club) | Transfermarkt, official league sites |
| Basketball | FIBA, NBA official |
| Baseball | MLB, WBSC |

### 2. Fetch official data using web_fetch

Use multiple queries to cross-reference:

```
web_fetch → official tournament page → get all groups, teams, dates, venues
web_fetch → qualification page → get confirmed qualified teams by confederation
web_fetch → schedule page → get match dates, times, stadiums
```

**Example prompt for web_fetch:**
```
"Necesito confirmar los 48 equipos clasificados al Mundial 2026 y sus grupos oficiales.
¿Cuáles son los 12 grupos completos A-L? ¿Cuáles son las sedes y fechas de los partidos?"
```

### 3. Build a comparison table

For each data domain, create a side-by-side comparison:

| Domain | In app | Official source | Status |
|--------|--------|----------------|--------|
| Teams in Group A | México, Sudáfrica, Chequia, **Italia** | México, Sudáfrica, **Corea del Sur**, Chequia | ❌ WRONG |
| Match A1 venue | Estadio Azteca | Estadio Azteca, Mexico City | ✅ CORRECT |
| Match A1 date | 2026-06-11 02:00 UTC | 2026-06-11 19:00 local | ⚠️ VERIFY TZ |

### 4. Categorize errors by severity

| Severity | Examples | Action |
|----------|----------|--------|
| **Critical** | Wrong teams in groups, missing qualified teams | Must fix before any release |
| **High** | Wrong dates, wrong venues, wrong knockout bracket | Fix before next demo |
| **Medium** | Wrong star players, outdated Elo ratings | Fix in next sprint |
| **Low** | Formatting inconsistencies, alias names | Fix opportunistically |

### 5. Fix all data files systematically

For a typical Next.js sports prediction app:

| File | What to fix |
|------|-------------|
| `lib/teams.ts` | Team list, group assignments, confederations, star players |
| `lib/matches.ts` | All 72+ group matches with official dates/times/venues, knockout bracket |
| `lib/predictor-engine.ts` | Elo ratings, power ratings, name aliases for consistency |
| `lib/tournament-sim.ts` | Knockout bracket mapping (R32→Final), group→position logic |
| `README.md` | Group tables shown to users |
| `CONTEXT.md` | Architecture documentation |

### 6. Handle name inconsistencies

Teams may be named differently across files. Create an alias map:

```typescript
const TEAM_ALIASES: Record<string, string> = {
  'Chequia': 'República Checa',  // app name → ELO database name
};
```

### 7. Update tests to match new data

After changing data files, update corresponding tests:
- Team names in assertions
- Match IDs and round names
- Expected group sizes
- Fallback flag emoji

### 8. Verify build and tests

```bash
npm run build    # Must compile without errors
npm run test:run # All tests must pass
```

### 9. Commit with detailed message

```
fix: oficial WC2026 datos — 48 equipos reales, calendario oficial, bracket corregido

- teams.ts: 48 equipos OFICIALES FIFA (Corea del Sur reemplaza a Italia en Grupo A)
- matches.ts: 72 partidos fase de grupos con fechas/sedes OFICIALES FIFA
- tournament-sim.ts: bracket corregido formato 48 equipos
- tests: actualizados para nuevas exportaciones
```

## Common pitfalls to avoid

1. **Don't trust AI-generated tournament data** — LLMs invent plausible-looking but incorrect group assignments. Always verify with official sources.
2. **Time zones matter** — Official schedules show local time. Convert to UTC consistently for your app.
3. **Knockout bracket format changes** — 48-team World Cup (2026) has Round of 32, not Round of 16. The bracket mapping is completely different from 32-team format.
4. **Qualified vs TBD** — Before the official draw, some slots are "TBD". After qualification is complete, all 48 teams are known but groups aren't assigned until the draw.
5. **Remove orphaned data** — If you remove a team from groups, also remove it from ELO ratings (or mark as historical reference only).

## Quick reference: WC2026 format

- **48 teams** in 12 groups (A-L), 4 teams each
- **72 group stage matches** (6 per group × 12 groups)
- **Round of 32**: 24 qualified (1st + 2nd from each group) + 8 best 3rd place = 32 teams
- **Round of 16**: 16 winners from R32
- **Quarterfinals**: 8 winners from R16
- **Semifinals**: 4 winners from QF
- **Third Place**: July 18, 2026 — Hard Rock Stadium, Miami
- **Final**: July 19, 2026 — MetLife Stadium, New York
