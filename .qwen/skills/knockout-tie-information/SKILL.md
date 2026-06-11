---
name: knockout-tie-information
description: Display explicit tie-breaker information for knockout stage predictions where the 90-minute score is a draw — show whether the predicted winner advances via extra time or penalties
source: auto-skill
extracted_at: '2026-06-11T23:20:55.867Z'
---

## Knockout Tie Information

In knockout tournaments, matches that are drawn after 90 minutes go to extra time and potentially penalties. Prediction engines that output integer goal scores will frequently produce ties (1-1, 2-2) for closely-matched knockout matches. Without additional context, users see "1-1" and assume it's a draw — but in knockout, there must be a winner.

### The Problem

```
Semifinal: Brazil vs France
Predicted: 1-1
```

User reads "1-1" and thinks the prediction is a draw. But in knockout, one team advances. The prediction engine may assign a slight edge (e.g., Brazil 52% vs France 48%), but this is invisible in the score display.

### The Solution

Detect tight knockout predictions and display tie-breaker info:

```tsx
const isKO = match.round !== 'group';
const isTight = match.homeGoals === match.awayGoals && isKO;

{isTight && (
  <div className="text-[10px] text-accent-amber/80 bg-accent-amber/10 px-2 py-0.5 rounded text-center">
    ⚽ Empate 90 min → {match.penalties ? 'Gana en penales' : 'Gana en alargue'}
  </div>
)}
```

Result:
```
Semifinal: Brazil vs France
Predicted: 1-1
⚽ Empate 90 min → Gana en penales
```

### Implementation Rules

1. **Only show for knockout rounds** — group stage matches CAN end in draws
2. **Only show when homeGoals === awayGoals** — not needed for decisive scores
3. **Determine tie-breaker method** — use probability differential to decide:
   - If homeWin > awayWin by > 5% → home wins in extra time
   - If difference ≤ 5% → goes to penalties
   - Random assignment is acceptable if the engine doesn't model ET/penalties

### Where to Display

- **Match cards**: Below the score line, as an amber badge
- **Detail modal**: In the header section below the predicted score
- **Bracket view**: As a small note below the score
- **Not in compact rows** — too much detail for scan views

### When to Use

- Any knockout tournament prediction system
- World Cup, Champions League, Copa América, etc.
- When the prediction engine outputs integer scores (not decimal with ET)
- When users need to understand who advances, not just the 90-minute score
