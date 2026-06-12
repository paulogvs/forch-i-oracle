---
name: panel-consolidation-pattern
description: Merge related but separate pages into a single page with internal tabs to reduce navigation complexity and eliminate redundant routes
source: auto-skill
extracted_at: '2026-06-11T23:20:55.867Z'
---

## Panel Consolidation Pattern

When an app has too many separate pages that serve related purposes, consolidate them into fewer pages with internal tabs. This reduces navigation cognitive load and eliminates redundant chrome (headers, footers, layout wrappers).

### Before → After

**Before (5 pages):**
```
Dashboard → shows accuracy metrics
Predicción → shows 128 match predictions
Simulador → shows Top 8 champion + bracket
En Vivo → shows real vs predicted
Benchmark → shows model comparison + leaderboard (removed — asked for manual input)
```

**After (4 pages with nested tabs):**
```
Dashboard → accuracy metrics
Predicción → [🔮 Predicciones | 🏆 Top 8 | 📐 Bracket]  ← 3 tabs merged
En Vivo → [📋 Tabla de Grupos | 🏆 Eliminatorias]  ← 2 tabs
Benchmark → [📊 Consenso | 🤖 Modelos | ℹ️ Acerca de]  ← 3 tabs, NO leaderboard
```

### Implementation Pattern

**1. Main page with tab state:**

```tsx
type MainTab = 'predicciones' | 'top8' | 'bracket';

export default function ConsolidatedPage() {
  const [mainTab, setMainTab] = useState<MainTab>('predicciones');

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4">
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            className={mainTab === t.id ? 'active-tab' : 'inactive-tab'}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {mainTab === 'predicciones' && <PredictionsTab />}
      {mainTab === 'top8' && <Top8Tab />}
      {mainTab === 'bracket' && <BracketTab />}
    </>
  );
}
```

**2. Redirect old route:**

```tsx
// app/old-page/page.tsx
import { redirect } from 'next/navigation';
export default function OldPageRedirect() { redirect('/new-page'); }
```

**3. Clean up navigation:**

Remove the old route from sidebar/nav. Update any internal links that pointed to the old route.

### When to Consolidate

- Two pages share the same data source or calculation engine
- Users frequently switch between the two pages
- One page is essentially a subset view of the other
- Navigation has more than 5 top-level items
- Pages have overlapping functionality (e.g., both show brackets)

### When NOT to Consolidate

- Pages serve completely different user intents
- Each page is complex enough to warrant full screen real estate
- Users never visit both pages in the same session
- Different authentication/permission requirements

### Anti-patterns to Avoid

- Don't nest tabs more than 2 levels deep (tabs within tabs within tabs)
- Don't put unrelated content in the same tabbed page
- Don't forget to redirect the old route — leave a redirect, not a 404
- Don't remove the old route from navigation before adding the redirect
