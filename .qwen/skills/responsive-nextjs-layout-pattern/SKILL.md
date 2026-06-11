---
name: responsive-nextjs-layout-pattern
description: Responsive layout architecture for Next.js apps with sidebar navigation — avoids common padding, z-index, and offset bugs
source: auto-skill
extracted_at: '2026-06-11T18:00:00.000Z'
---

# Responsive Next.js Layout with Sidebar Navigation

When building a Next.js app with a fixed sidebar + top bar + scrollable content, follow this pattern to avoid layout bugs on both desktop and mobile.

## Core Layout Structure

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className="antialiased bg-[#050B14] min-h-screen">
        <div className="bg-mesh" aria-hidden="true" />
        <MainNav />
        <main className="lg:ml-64 min-h-screen pt-14">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
```

### Key rules:
1. **Padding lives ONLY in layout.tsx** — Do NOT add `px-4 md:px-8 py-6` to every page. The layout wrapper provides it once.
2. **`main` has `lg:ml-64`** — Sidebar is `w-64` (256px). On desktop, main content shifts right by exactly 64px Tailwind units (= 256px).
3. **`main` has `pt-14`** — Top bar is `h-14` (56px). Content starts below it.
4. **Pages use `max-w-* mx-auto`** — Pages wrap content with a max-width container, NOT additional padding.

## Sidebar Component

```tsx
// components/MainNav.tsx
<aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-[#08101C] ... ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
```

### Key rules:
1. **z-index hierarchy**: Sidebar `z-40` > Top bar `z-20`. On mobile, sidebar slides OVER the top bar.
2. **Width**: `w-64` (256px) — matches the `lg:ml-64` offset in main.
3. **Mobile backdrop**: `fixed inset-0 z-30 bg-black/50 backdrop-blur-sm` — sits behind sidebar, closes on tap.
4. **Always translate, never `hidden`**: Use `translate-x-full` / `translate-x-0` for smooth transitions. `hidden` breaks animation.

## Top Bar

```tsx
<header className="fixed top-0 left-0 right-0 z-20 h-14 bg-[#050B14]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-3 sm:px-4 lg:px-6 lg:pl-[272px]">
```

### Key rules:
1. **Desktop padding-left**: `lg:pl-[272px]` = 256px (sidebar) + 16px (gap). Content doesn't sit flush against sidebar.
2. **Mobile padding**: `px-3 sm:px-4 lg:px-6` — scales up progressively.
3. **Hamburger button**: `-ml-1` on mobile to align with edge padding.

## Page Content Pattern

```tsx
// app/any-page/page.tsx
export default function AnyPage() {
  return (
    <div className="max-w-6xl mx-auto">  {/* ← NO px/py here */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Title</h1>
        <button className="btn-premium text-xs px-4 py-2 shrink-0 whitespace-nowrap">Action</button>
      </div>
      {/* Grid: responsive columns */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        ...
      </div>
    </div>
  );
}
```

### Key rules:
1. **No padding on page wrapper** — Layout provides it. Only `max-w-* mx-auto` for centering.
2. **Headings**: `text-xl sm:text-2xl` — start small, scale up. Don't use `md:text-3xl` unless hero content.
3. **Buttons in flex rows**: `shrink-0 whitespace-nowrap` — prevents squishing on mobile.
4. **Headers**: `flex-col sm:flex-row sm:items-end` — stacks vertically on mobile, side-by-side on desktop.
5. **Grids**: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` — 2 columns always readable on phones.

## Common Bugs Fixed

| Bug | Cause | Fix |
|---|---|---|
| Content hidden behind sidebar on desktop | Missing `lg:ml-64` on main | Add `lg:ml-64` to `<main>` |
| Double padding on pages | Padding in layout AND page | Remove from page, keep in layout |
| Top bar above sidebar on mobile | Top bar z-index > sidebar z-index | Sidebar `z-40`, top bar `z-20` |
| Buttons squished in header row | No `shrink-0` on flex children | Add `shrink-0 whitespace-nowrap` |
| Text overflows card on mobile | No `truncate min-w-0` | Add `truncate` + `min-w-0` on text container |
| Sidebar animation janky | Using `hidden` instead of translate | Use `translate-x-full` / `translate-x-0` |