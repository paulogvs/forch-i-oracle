---
name: design-token-migration
description: Migrate CSS design tokens globally across a codebase while maintaining backward compatibility via CSS composes fallbacks
source: auto-skill
extracted_at: '2026-06-12T14:46:15.894Z'
---

## Problem
A project needs a complete design system overhaul (new CSS variable names, new class names) but has 20+ components that reference the old tokens. Manually updating each file is error-prone and blocks incremental rollout.

## Solution: Two-phase migration with CSS compatibility layer

### Phase 1: New design system + backward compat in CSS

Write the new design system (CSS variables, utility classes) into `globals.css`, then add `composes` directives at the bottom that map old class names to new ones:

```css
/* ─── NEW SYSTEM ─── */
.surface {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  /* ... */
}

/* ─── LEGACY COMPATIBILITY — keeps old components working ─── */
.glass-card { composes: surface from global; }
.glass-card-static { composes: surface-elevated from global; }
.text-gradient-gold { composes: text-gold from global; }
```

This means **old components using `.glass-card` will still render correctly** even before their TypeScript/TSX files are updated.

### Phase 2: Bulk token replacement via PowerShell one-liner

Use a single PowerShell command to replace all old token references across `app/` and `components/`:

```powershell
Get-ChildItem -Path app,components -Recurse -Include *.tsx,*.ts | ForEach-Object {
  $f = $_.FullName
  $c = Get-Content $f -Raw -Encoding UTF8
  $orig = $c
  $c = $c -replace 'bg-bg-primary\b', 'bg-canvas'
  $c = $c -replace 'bg-bg-secondary\b', 'bg-surface'
  $c = $c -replace 'bg-bg-tertiary\b', 'bg-elevated'
  $c = $c -replace 'text-text-primary\b', 'text-fg-primary'
  $c = $c -replace 'text-text-secondary\b', 'text-fg-secondary'
  $c = $c -replace 'text-gradient-gold\b', 'text-gold'
  $c = $c -replace 'accent-cyan\b', 'accent-primary'
  $c = $c -replace 'accent-emerald\b', 'state-success'
  $c = $c -replace 'accent-crimson\b', 'state-danger'
  $c = $c -replace 'accent-gold\b', 'accent-premium'
  $c = $c -replace 'glass-card-static\b', 'surface-elevated'
  if ($c -ne $orig) {
    Set-Content $f -Value $c -Encoding UTF8 -NoNewline
    Write-Output "Updated: $($f)"
  }
}
```

### Why this works

1. **Safety net**: The `composes` directives mean old class names still resolve to correct styles
2. **Atomic**: If Phase 2 breaks something, the CSS fallback still renders correctly
3. **Verifiable**: Run `tsc --noEmit` after to catch type issues from the bulk replacement
4. **Incremental**: You can update components one-by-one later; the compat layer covers what hasn't been touched yet

### Typical token mapping pattern

| Old token | New token |
|-----------|-----------|
| `bg-bg-primary` | `bg-canvas` |
| `bg-bg-secondary` | `bg-surface` |
| `bg-bg-tertiary` | `bg-elevated` |
| `bg-bg-elevated` | `bg-overlay` |
| `text-text-primary` | `text-fg-primary` |
| `text-text-secondary` | `text-fg-secondary` |
| `text-text-tertiary` | `text-fg-tertiary` |
| `text-text-muted` | `text-fg-disabled` |
| `text-gradient-gold` | `text-gold` |
| `glass-card` | `surface` |
| `glass-card-static` | `surface-elevated` |
| `accent-cyan` | `accent-primary` |
| `accent-emerald` | `state-success` |
| `accent-crimson` | `state-danger` |
| `accent-gold` | `accent-premium` |
| `accent-amber` | `state-warning` |
| `accent-blue` | `accent-primary` |

### After migration: validate

```bash
npx tsc --noEmit    # should be 0 errors
npm run lint        # check for remaining old token references
npm run build       # full production build
```

If `composes` causes issues in some Tailwind setups, use utility class aliasing in `tailwind.config.ts` instead:

```ts
// tailwind.config.ts
theme: {
  extend: {
    // new tokens defined here
  }
}
// Keep old names as plugins or via @apply in CSS
```
