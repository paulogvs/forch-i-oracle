# 📋 CIRCUITO CERRADO DE PREDICCIONES — CHANGELOG

## Fecha: 2026-07-02

## Resumen

Se implementó un **circuito cerrado de predicciones** (closed-loop) completo en forch-i-oracle, eliminando fugas de datos, unificando fuentes de verdad y estandarizando nombres de rondas en toda la cadena.

---

## Fix #1 — Unificación de nombres de rondas

**Archivos modificados:** `lib/data-layer/types.ts`, `lib/data-layer/in-memory.ts`, `app/api/fixture/route.ts`, `app/fixture/page.tsx`

**Qué cambió:**
- Se agregó `'TP'` (Tercer Puesto) al tipo `MatchRound` (antes solo tenía `'group' | 'R32' | 'R16' | 'QF' | 'SF' | 'F'`)
- El data layer (`in-memory.ts`) ahora mapea `'third'` → `'TP'` (además de los mapeos existentes)
- El fixture route (`POST /api/fixture`) normaliza `match.round` a la notación unificada (`round-32→R32, quarter→QF, semi→SF, third→TP, final→F`) en la respuesta
- El fixture page (`page.tsx`) actualizó todos los labels, nombres de fases y filtros:
  - `round-32` → `R32`, `round-16` → `R16`, `quarter` → `QF`, `semi` → `SF`, `final` → `F`, `third` → `TP`
  - Se eliminó el duplicado de `getRoundLabel`
  - Champion banner ahora responde a `SF` y `F` en lugar de `semi` y `final`

**Por qué:** Había 2 sistemas de nomenclatura de rondas (uno legacy con `round-32/quarter/semi` y otro unificado con `R32/QF/SF`). Esto causaba que los brackets no se renderizaran correctamente y los filtros por fase fallaran.

---

## Fix #2 — Live-scores: IDs internos de match

**Archivo modificado:** `app/api/live-scores/route.ts`

**Qué cambió:**
- La función `persistFromFIFALiveScore` ahora acepta `internalMatchId` como parámetro y lo usa como identificador en el data layer
- El mapeo de FIFA API IDs a IDs internos se realiza con un diccionario `fifaIdToInternalId`
- Ya no se construye `matchId = FIFA-{n}` (formato incompatible con los IDs internos del sistema)
- Se agregó fallback: si el ID FIFA no tiene mapeo directo, se busca por nombres de equipo en `ALL_MATCHES`

**Por qué:** Live-scores usaba IDs `FIFA-{n}` incompatibles con IDs internos (`A1`, `R32-5`, etc.), impidiendo que los resultados reales se asignaran correctamente a los partidos.

---

## Fix #3 — Fixture route: bracket resolution siempre activa

**Archivo modificado:** `app/api/fixture/route.ts`

**Qué cambió:**
- `resolveKnockoutTeamNames(db)` ahora se ejecuta **siempre** en cada POST, no solo cuando hay datos nuevos de API externa
- El bracket se resuelve desde los resultados de grupo disponibles en el data layer, propagando nombres de equipos reales a todas las rondas eliminatorias
- Se agregó manejo de errores no-bloqueante (`.catch()` con `console.warn`)

**Por qué:** Antes, si el poll externo estaba throttled (no había datos nuevos), el bracket no se recalculaba. Ahora los slots del bracket (ej. `1A`, `3B/3E/3F/3G`) siempre se resuelven a nombres reales de equipo.

---

## Fix #4 — Partidos próximos visibles sin predicción

**Archivos modificados:** `app/fixture/page.tsx`, `lib/dashboard-utils.ts`

**Qué cambió:**
- En fixture page: se eliminó el filtro `.filter(m => m.isPredicted)` del cálculo de `upcoming4` — ahora solo requiere `!m.isFinished`
- En dashboard-utils: se eliminó `if (!p.predictedScore) return false` del filtro de partidos próximos

**Por qué:** Partidos R32 con equipos TBD (bracket no propagado) tenían `predictedScore = null`, y el filtro `isPredicted` los ocultaba de la sección "Próximos Partidos". Al eliminar este filtro, los próximos partidos se muestran incluso cuando la predicción exacta está pendiente.

---

## Fix #5 — Unificación de rounds en output de API

**Archivo modificado:** `app/api/fixture/route.ts`

**Qué cambió:**
- Se agregó normalización de round names en el loop de knockout matches
- El campo `round` en la respuesta ahora SIEMPRE usa la notación `R32/R16/QF/SF/TP/F`

**Por qué:** La fixture route tomaba `match.round` directamente de `ALL_MATCHES` (que usa nombres legacy), enviando `round-32`, `quarter`, etc. al frontend, que ya esperaba la notación unificada.

---

## Fix #6 — Circuito Cerrado (Closed Loop)

**Flujo completo:**

```
FIFA Live API
    ↓ (IDs FIFA → IDs internos)
Live-scores route
    ↓ (persiste resultados al data layer)
Data Layer (SSOT)
    ↓ (resolveKnockoutTeamNames siempre activo)
Bracket con nombres reales
    ↓ (getOrComputeTournamentResults → Monte Carlo)
Predicciones de consenso
    ↓ (fixture route construye respuesta)
fixture page + dashboard
    ↓ (muestra próximos, resultados, precision)
```

**Principios:**
- **Single Source of Truth:** `lib/matches.ts` → `lib/data-layer/` (in-memory + file-store). El data layer es la única fuente que escribe y lee resultados.
- **Una sola ruta de bracket:** `getOrComputeTournamentResults()` en `lib/tournament-results.ts` es la única fuente de verdad para el bracket y champion probabilities.
- **ID único de match:** IDs alfanuméricos (`A1`, `R32-5`, `QF-1`, `SF-1`, `TP-1`, `FINAL`) consistentes en todo el sistema.
- **Auto-ciclo:** Live-scores → persistencia → bracket resolution → Monte Carlo → predicciones. Sin intervención manual.

---

## Resumen de archivos modificados

| Archivo | Cambios |
|---------|---------|
| `lib/data-layer/types.ts` | +1 línea: tipo `'TP'` añadido a `MatchRound` |
| `lib/data-layer/in-memory.ts` | +1 línea: mapeo `'third'` → `'TP'` |
| `app/api/fixture/route.ts` | ~8 líneas: normalizeRound + resolveKnockoutTeamNames siempre activo |
| `app/api/live-scores/route.ts` | ~15 líneas: mapeo FIFA IDs → IDs internos |
| `app/fixture/page.tsx` | ~10 líneas: rounds unificados, fase filter, getRoundLabel |
| `lib/dashboard-utils.ts` | -1 línea: eliminado filtro `predictedScore` |

---

## Verificación

- `npx tsc --noEmit` → **0 errores**
- `POST /api/fixture` → 104 partidos, 12 grupos, R32 16/16 resuelto, 22 próximos con predicción
- Rondas knockout en respuesta: `["R32","R16","QF","SF","TP","F"]`
- 77 partidos con `actualScore` mapeado correctamente
