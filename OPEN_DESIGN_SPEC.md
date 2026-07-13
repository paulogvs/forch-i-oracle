# FORCH.i ORACLE — Luxury Design Specification

## Design Philosophy

FORCH.i ORACLE is an oracle of numbers — a dark sanctuary where statistical prediction meets ceremonial presentation. Every pixel serves the narrative of probability: the gold trim recalls championship trophies, the glassmorphism depth layers information like strata of data, and the three-tier typography (serif for prophecy, sans for analysis, mono for truth) creates a sacred hierarchy. Light is scarce and intentional — used only to illuminate what matters: the score, the champion, the next match. This is not a dashboard; it is a divination instrument dressed in midnight velvet and gold thread.

---

## Page-by-Page Visual Improvements

### Dashboard (`/`)

| Element | Current | Luxury Upgrade |
|---------|---------|----------------|
| Hero title | `text-xl sm:text-2xl font-bold` | Use `font-display` (serif) with gold gradient text and subtle text shadow glow |
| StatPill cards | Flat `bg-elevated` with border | 3-layer luxury card with glassmorphism, gold glow on hover, emerald/gold accent icons |
| Upcoming match row | Simple surface row | Glass card with animated left border (gold gradient), team badges with flag glow |
| Results section | Status-colored backgrounds | Glass cards with colored top-border accent (3px) instead of full background tint — cleaner |
| Champion widget | Surface with gold border | **Champion banner** — radial gold glow background, serif champion name, animated probability bar |
| QuickLink | Surface interactive | Glass card with gold right-border that expands on hover (shimmer sweep) |

**Key visual:** The dashboard becomes a layered glass dashboard — cards float above the canvas with distinct shadow depths. The champion widget sits in a subtle gold-rimmed frame with a soft pulse animation.

### Fixture / Bracket (`/fixture`)

| Element | Current | Luxury Upgrade |
|---------|---------|----------------|
| Tab bar | `bg-elevated` with blue active pill | Glass tab bar with frosted background, active pill has gold gradient option for "bracket" tab |
| Phase filter pills | Small rounded buttons | Glass pills with active state using route's accent color + subtle glow |
| Match cards | Status bg-tinted cards | Glass match cards with left-border color strip (3px) matching status, score on its own elevated glass pill |
| Bracket rounds | Gradient backgrounds per round | **Bracket round sections** get their own glass panel with round-specific accent gradient header. Knockout matches use connector lines between nodes |
| Champion path | Row of compact steps | **Gold chain** — champion path rendered as connected gold-trimmed nodes with arrow connectors, the champion's flag progressively enlarging |
| Final card | Gold-tinted gradient | **Ceremonial final card** — large glass panel with gold border, center-divider line, animated trophy icon, serif team names |
| Modal | Glass panel | Full glass-panel treatment with gold-trim top edge, backdrop blur increased to 32px |

**Key visual:** The bracket reads as a tournament tree where each round has its own glass tier. The final sits at the center like a jewel, framed by concentric gold rings. Match cards are translucent — you see the canvas through them.

### Standings / Teams (`/teams`)

| Element | Current | Spec |
|---------|---------|------|
| Team rows | Simple table rows | Glass rows with team flag as a glowing avatar, Elo/power stats as mono columns |
| Group headers | Text only | Gold-bottom-border headers with group letter in a circular glass badge |
| Top 8 ranking | Simple list | **Podium flow** — top 3 get medal colors (gold/silver/bronze backgrounds), 4-8 use glass cards with decreasing opacity |
| Search/filter | Not present | Glass search input with gold focus ring, results appear in a glass dropdown |

### Stats (`/stats`)

| Element | Current | Spec |
|---------|---------|------|
| Bar charts | Gradient bars | Glass-background bars with gold gradient fill for champion probability |
| Confidence meter | Not specified | **Radial glass gauge** — circular progress indicator with gold arc, mono percentage in center |
| Form bubbles | Not specified | Glass capsules with team results (W/D/L) as colored glass beads connected by thin lines |
| Comparison bars | Not specified | Side-by-side glass bars for home/away team stat comparison, team colored fill |

---

## Component-Level Design Notes

### Luxury Card (3-Layer System)

Every card in the system follows this architecture:

```
Layer 0 (::after pseudo) — Gold glow border
  → invisible by default, reveals on hover
  → gradient: gold → gold-bright → gold
  → transition: 0.4s ease-out

Layer 1 (background) — Glassmorphism
  → rgba(12, 16, 23, 0.6) + backdrop-filter blur(20px)
  → border: 1px solid rgba(255,255,255,0.06)

Layer 2 (::before pseudo) — Inner highlight
  → linear-gradient(180deg, rgba(255,255,255,0.03), transparent)
  → creates 3D depth illusion
```

**Hover behavior:** Card lifts 2px (`translateY(-2px)`), border brightens, gold glow fades in, shadow deepens. This creates a "breathing" surface hierarchy.

### Status-Coded Elements

Never use full background color for status — use one of:
1. **Left border strip** (3px wide, rounded left corners only) — for cards
2. **Text color + icon** — for inline status
3. **Glow** — for important status (exact match, champion)

This keeps the glass aesthetic consistent while still communicating state.

### Gold as Hierarchy Signal

Gold is reserved for:
- Champion names, champion probability
- Exact score matches (gold glow instead of green)
- Navigation item for /fixture (primary prediction page)
- The "Campeón" badge
- Premium/featured content

Do NOT use gold for standard interactive elements (buttons, links) — those remain blue/violet.

### Score Display

Scores always use mono font with tabular-nums. The layout is:
- **Real score** — larger, top line, bold
- **Predicted score** — smaller, bottom line, dimmer
This visual stack communicates "reality above prediction" hierarchy.

---

## Animation Principles

1. **Motion is language** — Every animation communicates hierarchy. Cards rise (`slideUp`) on appear. Champion elements scale (`scaleIn`). Status changes fade.
2. **Spring for interaction** — Tab switches, card hovers, and interactive elements use `cubic-bezier(0.34, 1.56, 0.64, 1)` — an overshoot spring that feels alive.
3. **Out for content** — Page transitions, list reveals, and content animations use `cubic-bezier(0.16, 1, 0.3, 1)` — a smooth deceleration that never feels abrupt.
4. **Stagger reveals** — Lists stagger children by 30-50ms using CSS custom property `--i`. The delay is proportional to the item's position, creating a ripple effect.
5. **Glass shimmer on hover** — Cards have a hidden diagonal gradient that sweeps across on hover (`background-position: -200% → 200%`), mimicking light moving across frosted glass.
6. **Gold pulse** — Champion elements and gold-trimmed cards use a slow 3s pulse animation that subtly intensifies the gold glow. Never faster than 3s — luxury breathes slowly.
7. **Reduced motion** — Respect `prefers-reduced-motion: reduce` by collapsing all durations to 0.01ms. No exceptions.
8. **Modal entry** — Modals slide up from bottom on mobile (40px → 0), scale + fade on desktop. The backdrop fades in with a blur transition. Exit mirror the entry.

### Animation Quick Reference

| Trigger | Animation | Easing | Duration | Element |
|---------|-----------|--------|----------|---------|
| Page enter | fadeIn | ease-out | 220ms | Container |
| Card appear | slideUp | ease-out | 220ms | Cards |
| Tab switch | spring layoutId | spring | 350ms | Active pill |
| Champion reveal | scaleIn | spring | 500ms | Champion name |
| Hover lift | translateY | ease-out | 300ms | Luxury cards |
| Hover shimmer | bg-position sweep | ease-out | 600ms | Card overlay |
| Gold glow | pulseGold | ease-in-out | 3s | Premium elements |
| List stagger | slideUp per item | ease-out | 30ms * i | Lists |
| Modal open | slideUp + fade | ease-out | 300ms | Panel |
| Status change | fadeIn | ease-out | 200ms | Badge/icon |

---

## Tailwind Implementation Notes

### Class Mapping

```tsx
// Luxury card (base glass)
<div className="relative rounded-[var(--r-lg)] transition-all duration-300 ease-out
  bg-[rgba(12,16,23,0.6)] backdrop-blur-[20px] saturate-[180%] border border-[rgba(255,255,255,0.06)]
  hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3),0_4px_16px_rgba(0,0,0,0.2),0_0_0_1px_rgba(255,255,255,0.08)]">

// Gold variant
<div className="... border-[rgba(201,162,39,0.2)] shadow-[0_0_0_1px_rgba(201,162,39,0.08),0_8px_32px_rgba(0,0,0,0.2)]">

// Gold gradient text
<span className="bg-gradient-to-r from-[#C9A227] via-[#FFE69A] to-[#C9A227] bg-clip-text text-transparent font-display">

// Glass panel (heavy)
<div className="bg-[rgba(12,16,23,0.85)] backdrop-blur-[32px] saturate-[200%]
  border border-[rgba(255,255,255,0.08)]
  shadow-[0_24px_64px_rgba(0,0,0,0.5),0_8px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)]">

// Status border strip (left)
<div className="relative overflow-hidden ...">
  <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[inherit] bg-[#22C55E]" />
  ...content
</div>
```

### Priority Tailwind Extensions (add to `tailwind.config.ts`)

```ts
colors: {
  gold: { DEFAULT: '#C9A227', light: '#E2B340', bright: '#FFE69A', dark: '#A07F1A' },
}
fontFamily: {
  display: ['var(--font-playfair-display)', 'Georgia', 'serif'],
}
backdropBlur: {
  glass: '20px', 'glass-md': '24px', 'glass-lg': '32px',
}
boxShadow: {
  'glass': '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
  'glow-gold': '0 0 0 1px rgba(201,162,39,0.5), 0 0 32px rgba(201,162,39,0.2)',
  'luxury': '0 12px 40px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.08)',
}
```
