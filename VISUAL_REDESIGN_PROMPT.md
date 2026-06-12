# FORCH.i ORACLE — Visual Redesign Prompt (CLI-Ready)

> Prompt detallado para mejorar la apariencia visual, colores, layout de cards y filtros de la app FORCH.i ORACLE (Next.js 14 + Tailwind CSS 3.4). Optimizado para usar con un CLI tipo Cursor/Claude Code.

---

## 1. DIAGNÓSTICO DE PROBLEMAS ACTUALES

### 1.1 Paleta de Colores — Monotonía y Baja Jerarquía

**Problema**: Todo es variaciones del mismo negro (#06080D → #0D1117 → #161B22 → #1F2630). Las superficies son prácticamente indistinguibles entre sí. El único acento real es el azul (#2B7FFF) que se usa para TODO: tabs activos, scores predichos, links, filtros, labels — perdiendo su impacto visual. El dorado (#D4AF37) solo aparece en "text-gold" del hero y título del sidebar, desperdiciado.

- `--canvas: #06080D` vs `--surface: #0D1117` vs `--elevated: #161B22`: Diferencia de luminosidad < 8% — el ojo no distingue
- Verde success (#00C853), naranja warning (#FF8C42), rojo danger (#FF3D57) solo aparecen en badges/seals diminutos
- No hay gradientes en superficies, todo es flat sin profundidad
- Los `glass-card` son idénticos visualmente sin importar su contenido

### 1.2 Cards — Densas, Pequeñas, Confusas

**MatchCard** (fixture/page.tsx):
- Texto a `text-[10px]` y `text-xs` por todos lados — ilegible en móvil
- Equipo nombre truncado a `max-w-[120px]` — corta nombres como "Corea del Sur"
- Score en `text-sm` con fondo `bg-accent-primary/10` — se pierde entre el ruido
- Barra de probabilidades `h-1.5` — imposible ver los segmentos
- Confidence badge diminuto no comunica urgencia

**LiveMatchRow** (live/page.tsx):
- Match ID (`m.id`) en mono `w-10 text-[10px]` — ruido visual sin utilidad
- "Real: X-X" y "Pred: X-X" en la misma línea sin separación visual
- Banda lateral (`border-l-2`) apenas visible en móvil
- Goleadores apilados sin estructura

**GroupTable / StandingsTable**:
- Tablas enteras en `text-[10px]` — subtítulos de película
- Columnas sin padding vertical suficiente (`py-0.5`)
- Equipos clasificados solo marcados con color de texto — no hay fondo o ícono
- `max-w-[70px]` y `max-w-[80px]` para nombres de equipos — insuficiente

### 1.3 Filtros y Tabs — Demasiados Niveles Idénticos

En `/fixture` hay **4 niveles de controles** apilados:
1. Main Tabs (Predicciones / Top 8 / Bracket) — `bg-white/[0.04] rounded-xl`
2. Phase Filter (Todos / Grupos / 1/16 / 1/8 / 1/4 / Semis / Final) — `bg-white/[0.04] rounded-lg`
3. Controls Row: Timezone + Partidos/Tablas toggle + Fecha/Grupo toggle — 3 controles en una fila

En `/live` hay **3 niveles**:
1. Tabs (Tabla de Grupos / Eliminatorias)
2. Phase Filter (idéntico al fixture)
3. Match list con fecha headers

**Problema**: Todos usan el mismo estilo visual (`bg-white/[0.04]`, `rounded-xl/lg`, `text-xs`, `text-accent-primary` cuando activo). El usuario no puede distinguir qué nivel de navegación está ajustando. No hay jerarquía visual entre tabs principales y sub-filtros.

### 1.4 Página En Vivo — Falta de Urgencia y Claridad

- Partidos "en vivo" (con `timeElapsed`) solo tienen un `🔴 {m.timeElapsed}` minúsculo con `animate-pulse`
- No hay fondo destacado, no hay badge grande, no hay card diferente para matches LIVE
- La lista de partidos es un scroll infinito sin secciones claras: LIVE / FINALIZADOS / POR JUGAR
- El accuracy summary es un texto chiquito sin card propio
- No hay "pulse visual" que transmita que algo está pasando EN VIVO AHORA

### 1.5 Top 8 y Bracket — Presentación Plana

- Top 8 es solo una lista vertical de cards con barras de progreso genéricas
- No hay podio visual, no hay rankings con medallas prominentes
- Bracket es una grid de 2 columnas sin líneas de conexión — parece una tabla, no un bracket
- La final no se siente especial — mismo `glass-card` que todo lo demás

---

## 2. SOLUCIÓN: REDESIGN VISUAL COMPLETO

### 2.1 Nueva Paleta de Colores — Alta Jerarquía y Contraste

Reemplazar los CSS custom properties en `globals.css`:

```css
:root {
  /* ─── NEUTRAL — más rango de grises para jerarquía ─── */
  --canvas:        #05070B;
  --surface:       #0C1017;
  --elevated:      #151C25;
  --overlay:       #1E2732;
  --raised:        #283445;    /* NUEVO: para hover states y elementos activos */

  --border-subtle: rgba(255,255,255,0.08);   /* subido de 0.06 */
  --border-strong: rgba(255,255,255,0.16);   /* subido de 0.12 */
  --border-focus:  #2B7FFF;

  /* ─── TEXT ─── */
  --text-primary:   #F0F6FC;
  --text-secondary: #94A3B8;   /* más claro que #8B98A8 */
  --text-tertiary:  #64748B;   /* más claro que #5A6677 */
  --text-disabled:  #3A4350;

  /* ─── ACCENT — azul como primario, pero con complementarios ─── */
  --accent-primary: #3B82F6;   /* azul más vibrante que #2B7FFF */
  --accent-secondary: #8B5CF6; /* NUEVO: violeta para Tabs secundarios */
  --accent-premium: #E2B340;   /* dorado más cálido/brillante */
  --accent-emerald: #10B981;   /* NUEVO: para En Vivo / Live */

  /* ─── STATE — más saturados para mejor visibilidad ─── */
  --state-success:  #22C55E;   /* más verde, menos neón */
  --state-warning:  #F59E0B;   /* amber cálido en vez de naranja */
  --state-danger:   #EF4444;   /* rojo más puro */

  /* ─── SURFACE TINTS — NUEVOS fondos con tinte de color ─── */
  --surface-blue:   rgba(59,130,246,0.08);
  --surface-green:  rgba(16,185,129,0.08);
  --surface-gold:   rgba(226,179,64,0.08);
  --surface-red:    rgba(239,68,68,0.08);
  --surface-violet: rgba(139,92,246,0.08);

  /* ─── GRADIENTS ─── */
  --gradient-gold:  linear-gradient(135deg, #E2B340 0%, #FFE69A 50%, #E2B340 100%);
  --gradient-live:  linear-gradient(90deg, #10B981, #22C55E);
  --gradient-blue:  linear-gradient(135deg, #3B82F6, #8B5CF6);

  /* ─── SHADOWS — más profundidad ─── */
  --shadow-sm:        0 1px 3px rgba(0,0,0,0.5);
  --shadow-md:        0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg:        0 16px 48px rgba(0,0,0,0.5);
  --shadow-glow-blue: 0 0 0 1px rgba(59,130,246,0.5), 0 0 32px rgba(59,130,246,0.2);
  --shadow-glow-gold: 0 0 0 1px rgba(226,179,64,0.5), 0 0 32px rgba(226,179,64,0.2);
  --shadow-glow-green: 0 0 0 1px rgba(16,185,129,0.5), 0 0 20px rgba(16,185,129,0.15); /* NUEVO */
  --shadow-glow-red:  0 0 0 1px rgba(239,68,68,0.4), 0 0 16px rgba(239,68,68,0.12); /* NUEVO */

  /* ─── RADII ─── */
  --r-sm: 8px;     /* subido de 6px */
  --r-md: 12px;    /* subido de 10px */
  --r-lg: 16px;    /* subido de 14px */
  --r-xl: 24px;    /* subido de 20px */
}
```

**Tailwind config** — agregar colores nuevos:

```ts
colors: {
  // ... existentes ...
  accent: {
    primary: 'var(--accent-primary)',
    secondary: 'var(--accent-secondary)',  // NUEVO violeta
    premium: 'var(--accent-premium)',
    emerald: 'var(--accent-emerald)',       // NUEVO para En Vivo
  },
  surface: {
    default: 'var(--surface)',
    blue: 'var(--surface-blue)',    // NUEVO
    green: 'var(--surface-green)',  // NUEVO
    gold: 'var(--surface-gold)',    // NUEVO
    red: 'var(--surface-red)',      // NUEVO
    violet: 'var(--surface-violet)',// NUEVO
  },
  raised: 'var(--raised)',  // NUEVO
}
```

### 2.2 Sistema de Superficies con Tintes de Color

Reemplazar las 3 clases `.surface` por **6 variantes con tinte temático**:

```css
/* ─── SURFACES CON TINTE ─── */
.surface {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  transition: border-color var(--d-normal) var(--ease-out),
              background var(--d-normal) var(--ease-out);
}
.surface:hover { border-color: var(--border-strong); }

.surface-elevated {
  background: var(--elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-md);
}

/* NUEVOS: Surfaces temáticas */
.surface-live {
  background: var(--surface-green);
  border: 1px solid rgba(16,185,129,0.2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-glow-green);
  animation: livePulse 3s ease-in-out infinite;
}

.surface-gold {
  background: var(--surface-gold);
  border: 1px solid rgba(226,179,64,0.25);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-glow-gold);
}

.surface-blue {
  background: var(--surface-blue);
  border: 1px solid rgba(59,130,246,0.2);
  border-radius: var(--r-lg);
}

.surface-danger {
  background: var(--surface-red);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: var(--r-lg);
}

@keyframes livePulse {
  0%, 100% { box-shadow: var(--shadow-glow-green); }
  50%      { box-shadow: 0 0 0 1px rgba(16,185,129,0.6), 0 0 30px rgba(16,185,129,0.25); }
}
```

### 2.3 Rediseño de Cards de Partido — MatchCard v2

**Principio**: Cada card debe ser escaneable en <1 segundo. Score prominente, equipos claros, probabilidades legibles.

```tsx
// Reemplazar MatchCard en fixture/page.tsx

function MatchCard({ match, getFlag, getRoundLabel, onDetail }) {
  const isKO = match.round !== 'group';
  const isTight = match.homeGoals !== null && match.homeGoals === match.awayGoals && isKO;
  const isPredicted = match.homeGoals !== null;

  return (
    <button
      onClick={onDetail}
      className={cn(
        "w-full text-left cursor-pointer group rounded-[var(--r-lg)] p-4",
        "border transition-all duration-200",
        // Diferentes fondos según tipo de partido
        isKO
          ? "bg-surface-gold border-accent-premium/15 hover:border-accent-premium/30"  // Eliminatoria: dorado
          : "bg-surface border-border-subtle hover:border-border-strong",              // Grupo: normal
      )}
    >
      {/* Header: Ronda + Hora + Confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-accent-premium uppercase tracking-wide">
            {getRoundLabel(match.round)}
          </span>
          {isKO && (
            <span className="px-1.5 py-0.5 rounded bg-accent-premium/15 text-[9px] font-bold text-accent-premium uppercase">
              KO
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {match.confidence && (
            <ConfidenceBadge confidence={match.confidence} />
          )}
          <span className="text-[11px] text-fg-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
            Ver detalle →
          </span>
        </div>
      </div>

      {/* Cuerpo: Equipos + Score */}
      <div className="space-y-2">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xl shrink-0">{getFlag(match.homeTeam)}</span>
            <span className="text-sm font-medium text-fg-primary truncate">{match.homeTeam}</span>
          </div>
          {isPredicted ? (
            <span className="text-lg font-bold font-mono text-accent-primary bg-accent-primary/10 px-3 py-1 rounded-lg ml-3 shrink-0">
              {match.homeGoals}
            </span>
          ) : (
            <span className="text-sm text-fg-disabled ml-3 shrink-0">—</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-xl shrink-0">{getFlag(match.awayTeam)}</span>
            <span className="text-sm font-medium text-fg-primary truncate">{match.awayTeam}</span>
          </div>
          {isPredicted ? (
            <span className="text-lg font-bold font-mono text-accent-primary bg-accent-primary/10 px-3 py-1 rounded-lg ml-3 shrink-0">
              {match.awayGoals}
            </span>
          ) : (
            <span className="text-sm text-fg-disabled ml-3 shrink-0">—</span>
          )}
        </div>
      </div>

      {/* Empate en eliminatoria */}
      {isTight && (
        <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-state-warning/10 border border-state-warning/20 text-center">
          <span className="text-[11px] font-semibold text-state-warning">
            ⚡ Empate 90' → {match.penalties ? 'Penales' : 'Alargue'}
          </span>
        </div>
      )}

      {/* Barra de probabilidades — MÁS GRANDE */}
      {isPredicted && match.homeWin !== null && (
        <div className="mt-3">
          <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${match.homeWin}%` }}
              className="bg-accent-primary/70 rounded-l-full transition-all duration-700"
            />
            <div
              style={{ width: `${match.draw}%` }}
              className="bg-fg-disabled/30 transition-all duration-700"
            />
            <div
              style={{ width: `${match.awayWin}%` }}
              className="bg-state-danger/70 rounded-r-full transition-all duration-700"
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[11px]">
            <span className="text-accent-primary font-semibold">{match.homeWin}%</span>
            <span className="text-fg-tertiary">{match.draw}%</span>
            <span className="text-state-danger font-semibold">{match.awayWin}%</span>
          </div>
        </div>
      )}
    </button>
  );
}

// NUEVO componente: Confidence Badge más visible
function ConfidenceBadge({ confidence }: { confidence: string }) {
  const config = {
    alta:   { bg: 'bg-state-success/15 border-state-success/30', text: 'text-state-success', icon: '🔥' },
    media:  { bg: 'bg-state-warning/15 border-state-warning/30', text: 'text-state-warning', icon: '⚡' },
    baja:   { bg: 'bg-fg-disabled/15 border-fg-disabled/30', text: 'text-fg-disabled', icon: '❓' },
  }[confidence] || { bg: 'bg-fg-disabled/15 border-fg-disabled/30', text: 'text-fg-disabled', icon: '❓' };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {confidence}
    </span>
  );
}
```

**Cambios clave**:
- Score más grande (`text-lg` + `px-3 py-1`) — protagonista visual
- Flags más grandes (`text-xl`) — identificación inmediata
- Eliminatorias tienen fondo dorado (`surface-gold`) para distinguirlas
- Barra de probabilidades más gruesa (`h-2.5`) con labels más legibles (`text-[11px]`)
- Quitado el match ID que era ruido visual
- Confidence badge con ícono y borde, no solo texto

### 2.4 Rediseño de la Página EN VIVO — Sub-paneles con Urgencia

**Principio**: La página EN VIVO debe sentirse DIFERENTE a la página de Predicciones. Debe transmitir urgencia, acción, resultados en tiempo real.

#### Estructura con sub-paneles:

```tsx
// Estructura de /live/page.tsx rediseñada

export default function LivePage() {
  // ... state igual ...
  const [liveSubPanel, setLiveSubPanel] = useState<'ahora' | 'resultados' | 'pendientes'>('ahora');

  // Separar matches en 3 categorías
  const liveNow = matches.filter(m => m.isLive);
  const finished = matches.filter(m => m.isPlayed && !m.isLive);
  const upcoming = matches.filter(m => !m.isPlayed && !m.isLive);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero con estado LIVE */}
      <div className="mb-6 animate-fade">
        <div className="surface-live p-5 rounded-[var(--r-xl)] mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-emerald/20 flex items-center justify-center">
                <span className="text-xl">📡</span>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Mundial en Vivo
                  {liveNow.length > 0 && (
                    <span className="live-dot inline-block w-2.5 h-2.5 rounded-full bg-accent-emerald" />
                  )}
                </h1>
                <p className="text-xs text-accent-emerald/80 mt-0.5">
                  {liveNow.length > 0
                    ? `${liveNow.length} partido${liveNow.length > 1 ? 's' : ''} en juego ahora`
                    : 'Sin partidos en juego · Resultados automáticos'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Accuracy badge grande */}
              {hasRealResults && (
                <div className="px-4 py-2 rounded-xl bg-surface border border-border-subtle">
                  <div className="text-lg font-bold font-mono text-state-success">{accuracy}%</div>
                  <div className="text-[10px] text-fg-tertiary">Precisión</div>
                </div>
              )}
              {lastUpdate && (
                <div className="text-[10px] text-fg-disabled flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
                  {lastUpdate}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-panel tabs — ESTILO DIFERENTE a los tabs de fixture */}
      <div className="flex gap-2 mb-5 animate-fade">
        {[
          { id: 'ahora', label: '🔴 En Juego', count: liveNow.length, variant: 'live' },
          { id: 'resultados', label: '✅ Resultados', count: finished.length, variant: 'default' },
          { id: 'pendientes', label: '⏳ Pendientes', count: upcoming.length, variant: 'default' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setLiveSubPanel(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
              liveSubPanel === tab.id
                ? tab.variant === 'live'
                  ? "bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30"
                  : "bg-raised text-fg-primary border border-border-strong"
                : "bg-surface text-fg-secondary border border-border-subtle hover:border-border-strong"
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 rounded-md text-[10px] font-bold",
                liveSubPanel === tab.id
                  ? "bg-white/10 text-fg-primary"
                  : "bg-white/[0.06] text-fg-tertiary"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENIDO POR SUB-PANEL */}
      {liveSubPanel === 'ahora' && (
        <LiveNowPanel matches={liveNow} getFlag={getFlag} />
      )}
      {liveSubPanel === 'resultados' && (
        <ResultsPanel matches={finished} getFlag={getFlag} accuracy={accuracy} correctCount={correctCount} playedCount={playedMatches.length} />
      )}
      {liveSubPanel === 'pendientes' && (
        <UpcomingPanel matches={upcoming} getFlag={getFlag} />
      )}

      {/* Leyenda */}
      <div className="surface p-4 mt-8 rounded-[var(--r-lg)]">
        <h4 className="text-[11px] font-bold text-fg-secondary uppercase tracking-wider mb-3">Leyenda</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* ... seals ... */}
        </div>
      </div>
    </div>
  );
}
```

#### LiveNowPanel — Cards con urgencia:

```tsx
function LiveNowPanel({ matches, getFlag }) {
  if (matches.length === 0) {
    return (
      <div className="surface p-10 text-center rounded-[var(--r-xl)]">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-green flex items-center justify-center mb-4">
          <span className="text-4xl">📡</span>
        </div>
        <p className="text-sm text-fg-primary font-semibold mb-1">Sin partidos en vivo ahora</p>
        <p className="text-xs text-fg-tertiary">Los partidos se actualizan automáticamente cada 30 minutos</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {matches.map((m, i) => (
        <div
          key={m.id}
          className="surface-live p-5 rounded-[var(--r-lg)] animate-rise"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* Header LIVE */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="live-dot w-2 h-2 rounded-full bg-accent-emerald" />
              <span className="text-xs font-bold text-accent-emerald uppercase tracking-wider">EN VIVO</span>
            </div>
            <span className="px-3 py-1 rounded-lg bg-accent-emerald/15 text-sm font-bold font-mono text-accent-emerald animate-pulse">
              {m.timeElapsed}'
            </span>
          </div>

          {/* Score grande */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getFlag(m.homeTeam)}</span>
                <span className="text-base font-semibold text-fg-primary">{m.homeTeam}</span>
              </div>
            </div>
            <div className="px-6 py-2 rounded-xl bg-canvas/60 border border-accent-emerald/20">
              <div className="text-3xl font-black font-mono text-fg-primary tracking-wider">
                {m.realHome} <span className="text-fg-tertiary mx-1">—</span> {m.realAway}
              </div>
            </div>
            <div className="flex-1 text-right">
              <div className="flex items-center gap-3 justify-end">
                <span className="text-base font-semibold text-fg-primary">{m.awayTeam}</span>
                <span className="text-3xl">{getFlag(m.awayTeam)}</span>
              </div>
            </div>
          </div>

          {/* Goleadores */}
          {(m.homeScorers?.length || m.awayScorers?.length) && (
            <div className="mt-3 pt-3 border-t border-accent-emerald/10 flex justify-between text-xs">
              <div className="text-accent-premium">
                {m.homeScorers?.map(s => `⚽ ${s}`).join(' · ')}
              </div>
              <div className="text-accent-premium">
                {m.awayScorers?.map(s => `⚽ ${s}`).join(' · ')}
              </div>
            </div>
          )}

          {/* Predicción vs Real */}
          {m.predHome !== null && (
            <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-4 text-xs">
              <span className="text-fg-tertiary">Predicción:</span>
              <span className="font-mono font-bold text-accent-primary">
                {m.predHome} - {m.predAway}
              </span>
              {computeSealStatus(m.predHome, m.predAway, m.realHome, m.realAway)?.winnerStatus === 'correct' ? (
                <span className="px-2 py-0.5 rounded-md bg-state-success/15 text-state-success text-[10px] font-bold">✓ Ganador</span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-state-danger/15 text-state-danger text-[10px] font-bold">✗ Ganador</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

#### ResultsPanel — Cards con feedback visual:

```tsx
function ResultsPanel({ matches, getFlag, accuracy, correctCount, playedCount }) {
  return (
    <div>
      {/* Accuracy summary card */}
      <div className="surface-blue p-4 rounded-[var(--r-lg)] mb-5 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/15 flex items-center justify-center">
            <span className="text-2xl font-bold font-mono text-accent-primary">{accuracy}%</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-fg-primary">Precisión del modelo</div>
            <div className="text-xs text-fg-tertiary">{correctCount} de {playedCount} ganadores acertados</div>
          </div>
        </div>
        {/* Mini barra de accuracy */}
        <div className="flex-1 h-3 bg-canvas rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-emerald transition-all duration-700"
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>

      {/* Match list agrupada por fecha */}
      {matches.length > 0 ? (
        <div className="space-y-2">
          {matches.map((m, i) => {
            const seal = computeSealStatus(m.predHome, m.predAway, m.realHome, m.realAway);
            const isCorrect = seal?.winnerStatus === 'correct';
            return (
              <div
                key={m.id}
                className={cn(
                  "p-4 rounded-[var(--r-lg)] border transition-all duration-200 animate-rise",
                  isCorrect
                    ? "bg-surface-green border-state-success/20"
                    : "bg-surface-red border-state-danger/15"
                )}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg shrink-0">{getFlag(m.homeTeam)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-fg-primary truncate">
                        {m.homeTeam} vs {m.awayTeam}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs">
                        <span className="text-fg-tertiary">Pred: <span className="font-mono font-bold text-accent-primary">{m.predHome}-{m.predAway}</span></span>
                        <span className="text-fg-disabled">→</span>
                        <span className="text-fg-tertiary">Real: <span className="font-mono font-bold text-state-success">{m.realHome}-{m.realAway}</span></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <MatchSeal dual winnerStatus={seal?.winnerStatus} scoreStatus={seal?.scoreStatus} />
                    <span className="text-lg">{getFlag(m.awayTeam)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="surface p-10 text-center rounded-[var(--r-xl)]">
          <p className="text-sm text-fg-tertiary">Sin resultados todavía</p>
        </div>
      )}
    </div>
  );
}
```

### 2.5 Rediseño de Tabs y Filtros — Jerarquía Visual Clara

**Principio**: Los tabs principales (nivel 1) deben verse DIFERENTES de los sub-filtros (nivel 2) que deben verse DIFERENTES de los toggles (nivel 3).

#### Nivel 1 — Main Tabs (Predicciones / Top 8 / Bracket):

```tsx
{/* Tabs principales — fondo elevado, íconos, borde lateral */}
<div className="flex gap-1 p-1.5 bg-elevated rounded-[var(--r-xl)] mb-5 border border-border-subtle">
  {MAIN_TABS.map(t => (
    <button
      key={t.id}
      onClick={() => setMainTab(t.id)}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[var(--r-lg)] text-sm font-semibold transition-all duration-200",
        mainTab === t.id
          ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/25"
          : "text-fg-secondary hover:text-fg-primary hover:bg-raised/50"
      )}
    >
      {t.icon}
      {t.label}
    </button>
  ))}
</div>
```

**Cambio**: Tab activo tiene fondo sólido `bg-accent-primary` con sombra, no solo un tinte. Esto lo hace inconfundible.

#### Nivel 2 — Phase Filters:

```tsx
{/* Phase filters — pills con contorno, no tabs */}
<div className="flex flex-wrap gap-2 mb-4">
  {PHASES.map(p => (
    <button
      key={p.id}
      onClick={() => setPhaseFilter(p.id)}
      className={cn(
        "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border",
        phaseFilter === p.id
          ? "bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30"  // VIOLETA para diferenciar de main tabs
          : "bg-transparent text-fg-tertiary border-border-subtle hover:text-fg-secondary hover:border-border-strong"
      )}
    >
      {p.label}
    </button>
  ))}
</div>
```

**Cambio**:
- Forma de pill (`rounded-full`) vs tabs rectangulares — distinguible
- Color violeta (`accent-secondary`) cuando activos — NO azul como los tabs principales
- Borde visible, no solo fondo

#### Nivel 3 — Toggle Buttons:

```tsx
{/* Toggles — segmented control minimal */}
<div className="flex gap-0 p-0.5 bg-canvas rounded-[var(--r-md)] border border-border-subtle">
  <button
    onClick={() => setViewMode('fecha')}
    className={cn(
      "px-3 py-1.5 rounded-[var(--r-sm)] text-[11px] font-semibold transition-all duration-150",
      viewMode === 'fecha'
        ? "bg-raised text-fg-primary shadow-sm"
        : "text-fg-tertiary hover:text-fg-secondary"
    )}
  >
    📅 Fecha
  </button>
  <button
    onClick={() => setViewMode('grupo')}
    className={cn(
      "px-3 py-1.5 rounded-[var(--r-sm)] text-[11px] font-semibold transition-all duration-150",
      viewMode === 'grupo'
        ? "bg-raised text-fg-primary shadow-sm"
        : "text-fg-tertiary hover:text-fg-secondary"
    )}
  >
    📋 Grupo
  </button>
</div>
```

**Cambio**: Toggle es compacto, fondo oscuro (`bg-canvas`), sin color accent — claramente secundario.

### 2.6 Tablas de Grupos — Legibilidad

```tsx
function StandingsTable({ group, teams, getFlag }) {
  return (
    <div className="surface p-4 rounded-[var(--r-lg)]">
      <h3 className="text-sm font-bold text-accent-premium uppercase mb-3 flex items-center gap-2">
        <span className="w-6 h-6 rounded-md bg-accent-premium/15 flex items-center justify-center text-xs font-bold text-accent-premium">
          {group}
        </span>
        Grupo {group}
      </h3>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-fg-tertiary text-[11px]">
            <th className="text-left pb-2 w-6" scope="col">#</th>
            <th className="text-left pb-2" scope="col">Equipo</th>
            <th className="text-center pb-2 w-8" scope="col">PJ</th>
            <th className="text-center pb-2 w-8" scope="col">PG</th>
            <th className="text-center pb-2 w-8" scope="col">PE</th>
            <th className="text-center pb-2 w-8" scope="col">PP</th>
            <th className="text-center pb-2 w-8" scope="col">GF</th>
            <th className="text-center pb-2 w-8" scope="col">GC</th>
            <th className="text-center pb-2 w-8" scope="col">DG</th>
            <th className="text-center pb-2 w-10" scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => (
            <tr
              key={t.name}
              className={cn(
                "border-t border-border-subtle",
                i < 2 ? "bg-surface-green/30" : ""  // Fondo verde sutil para clasificados
              )}
            >
              <td className="py-2 text-fg-tertiary">{i + 1}</td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getFlag(t.name)}</span>
                  <span className={cn(
                    "font-medium truncate max-w-[100px]",
                    i < 2 ? "text-fg-primary" : "text-fg-secondary"
                  )}>
                    {t.name}
                  </span>
                  {i < 2 && <span className="w-1.5 h-1.5 rounded-full bg-state-success shrink-0" />}
                </div>
              </td>
              <td className="py-2 text-center text-fg-secondary">{t.played}</td>
              <td className="py-2 text-center text-fg-secondary">{t.won}</td>
              <td className="py-2 text-center text-fg-secondary">{t.drawn}</td>
              <td className="py-2 text-center text-fg-secondary">{t.lost}</td>
              <td className="py-2 text-center text-fg-secondary">{t.gf}</td>
              <td className="py-2 text-center text-fg-secondary">{t.ga}</td>
              <td className={cn(
                "py-2 text-center font-mono",
                t.gd > 0 ? "text-state-success" : t.gd < 0 ? "text-state-danger" : "text-fg-tertiary"
              )}>
                {t.gd > 0 ? '+' : ''}{t.gd}
              </td>
              <td className="py-2 text-center font-bold text-fg-primary text-sm">{t.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Cambios**:
- Texto subido de `text-[10px]` a `text-xs` (12px)
- Flags de `text-base` para mejor visibilidad
- Equipos clasificados tienen fondo verde sutil + dot verde — no solo color de texto
- DG con color: verde si positivo, rojo si negativo
- Puntos en `text-sm font-bold` — columna más importante
- `py-2` en vez de `py-0.5` — más espacio para respirar
- `max-w-[100px]` en vez de `max-w-[70px]` — más espacio para nombres

### 2.7 Top 8 — Podio Visual con Rankings

```tsx
{/* Top 8 rediseñado — primeros 3 como podio, resto como lista */}
<div className="space-y-6">
  {/* Podio — Top 3 */}
  <div className="grid grid-cols-3 gap-3">
    {/* 2do lugar */}
    <div className="surface-blue p-4 rounded-[var(--r-lg)] text-center mt-6 animate-rise" style={{ animationDelay: '0ms' }}>
      <div className="text-4xl mb-2">{getFlag(top8[1]?.teamId)}</div>
      <span className="text-2xl">🥈</span>
      <div className="text-sm font-bold text-fg-primary mt-1">{top8[1]?.teamId}</div>
      <div className="text-lg font-bold font-mono text-accent-primary mt-1">{top8[1]?.championProb}%</div>
      <div className="w-full h-2 bg-canvas rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-accent-primary/50 rounded-full" style={{ width: `${top8[1]?.championProb}%` }} />
      </div>
    </div>

    {/* 1er lugar — MÁS GRANDE */}
    <div className="surface-gold p-5 rounded-[var(--r-xl)] text-center animate-pop" style={{ animationDelay: '100ms' }}>
      <div className="text-5xl mb-2">{getFlag(top8[0]?.teamId)}</div>
      <span className="text-3xl">🏆</span>
      <div className="text-base font-bold text-fg-primary mt-1">{top8[0]?.teamId}</div>
      <div className="text-2xl font-black font-mono text-accent-premium mt-1">{top8[0]?.championProb}%</div>
      <div className="w-full h-2.5 bg-canvas rounded-full mt-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${top8[0]?.championProb}%`, background: 'var(--gradient-gold)' }} />
      </div>
    </div>

    {/* 3er lugar */}
    <div className="surface-blue p-4 rounded-[var(--r-lg)] text-center mt-8 animate-rise" style={{ animationDelay: '200ms' }}>
      <div className="text-4xl mb-2">{getFlag(top8[2]?.teamId)}</div>
      <span className="text-2xl">🥉</span>
      <div className="text-sm font-bold text-fg-primary mt-1">{top8[2]?.teamId}</div>
      <div className="text-lg font-bold font-mono text-accent-primary mt-1">{top8[2]?.championProb}%</div>
      <div className="w-full h-2 bg-canvas rounded-full mt-2 overflow-hidden">
        <div className="h-full bg-accent-primary/40 rounded-full" style={{ width: `${top8[2]?.championProb}%` }} />
      </div>
    </div>
  </div>

  {/* Resto del Top 8 */}
  <div className="space-y-2">
    {top8.slice(3, 8).map((team, i) => (
      <div key={team.teamId} className="surface p-3 rounded-[var(--r-lg)] flex items-center justify-between animate-rise" style={{ animationDelay: `${(i + 3) * 60}ms` }}>
        <div className="flex items-center gap-3">
          <span className="w-7 text-center text-sm font-bold text-fg-tertiary">{i + 4}</span>
          <span className="text-xl">{getFlag(team.teamId)}</span>
          <span className="text-sm font-medium text-fg-primary">{team.teamId}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-canvas rounded-full overflow-hidden">
            <div className="h-full bg-accent-primary/30 rounded-full" style={{ width: `${team.championProb}%` }} />
          </div>
          <span className="text-sm font-bold font-mono text-accent-primary w-12 text-right">{team.championProb}%</span>
        </div>
      </div>
    ))}
  </div>
</div>
```

### 2.8 Bracket Visual — Cards con Líneas de Conexión

```tsx
function BracketRound({ title, matches, getFlag, roundIndex }) {
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold",
          roundIndex === 4 ? "bg-accent-premium/15 text-accent-premium" : "bg-accent-primary/10 text-accent-primary"
        )}>
          {roundIndex === 4 ? '🏆' : roundIndex + 1}
        </div>
        <h3 className="text-sm font-bold text-fg-primary">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matches.map((m) => (
          <BracketCard key={m.id} match={m} getFlag={getFlag} />
        ))}
      </div>
    </div>
  );
}

function BracketCard({ match, getFlag }) {
  if (!match) return null;
  const isPlayed = match.isPlayed;
  return (
    <div className={cn(
      "p-3 rounded-[var(--r-lg)] border transition-all",
      isPlayed
        ? "surface-blue border-state-success/20"
        : "surface border-border-subtle"
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-fg-tertiary font-medium uppercase tracking-wide">
          {match.roundLabel || 'Eliminatoria'}
        </span>
        {isPlayed && (
          <span className="text-[10px] font-bold text-state-success">✓</span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{getFlag(match.homeTeam)}</span>
            <span className={cn(
              "text-xs truncate",
              match.winner === match.homeTeam ? "font-bold text-accent-primary" : "text-fg-secondary"
            )}>
              {match.homeTeam}
            </span>
          </div>
          <span className={cn(
            "font-mono font-bold text-sm px-2.5 py-0.5 rounded-md ml-2 shrink-0",
            match.winner === match.homeTeam
              ? "bg-accent-primary/15 text-accent-primary"
              : "bg-raised text-fg-tertiary"
          )}>
            {match.homeScore ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{getFlag(match.awayTeam)}</span>
            <span className={cn(
              "text-xs truncate",
              match.winner === match.awayTeam ? "font-bold text-accent-primary" : "text-fg-secondary"
            )}>
              {match.awayTeam}
            </span>
          </div>
          <span className={cn(
            "font-mono font-bold text-sm px-2.5 py-0.5 rounded-md ml-2 shrink-0",
            match.winner === match.awayTeam
              ? "bg-accent-primary/15 text-accent-primary"
              : "bg-raised text-fg-tertiary"
          )}>
            {match.awayScore ?? '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. RESUMEN DE ARCHIVOS A MODIFICAR

| Archivo | Cambio Principal |
|---------|-----------------|
| `app/globals.css` | Nueva paleta, surfaces temáticas, animación livePulse, nuevos --surface-tint, --gradient, --shadow |
| `tailwind.config.ts` | Agregar accent.secondary, accent.emerald, surface.blue/green/gold/red/violet, raised |
| `app/fixture/page.tsx` | MatchCard v2, ConfidenceBadge, StandingsTable legible, tabs con jerarquía visual, filtro pills violetas |
| `app/live/page.tsx` | Sub-paneles (En Juego / Resultados / Pendientes), LiveNowPanel, ResultsPanel, surface-live, accuracy card |
| `app/page.tsx` | MetricCard con colores temáticos por tinte, LiveMatchRow con más tamaño |
| `app/benchmark/page.tsx` | Consensus card con surface-gold, modelos table legible |
| `components/MatchSeal.tsx` | Seals más grandes, texto legible |
| `components/ComparisonBars.tsx` | Barras más gruesas, labels más grandes |
| `components/FormBubbles.tsx` | Bubbles más grandes (w-7 h-7), texto legible |
| `components/layout/AppShell.tsx` | Sidebar con branding mejorado, nav items con tinte de color |
| `components/ui/Surface.tsx` | Agregar variantes 'live', 'gold', 'blue', 'danger' |
| `components/ui/ProbabilityBar.tsx` | Altura mínima h-3, gradientes, labels más legibles |

---

## 4. REGLAS DE DISEÑO A SEGUIR

1. **Jerarquía de color por función**:
   - 🔵 Azul (`accent-primary`) = Predicciones, scores, acciones principales
   - 🟣 Violeta (`accent-secondary`) = Filtros, sub-navegación
   - 🟢 Emerald (`accent-emerald`) = En Vivo, matches activos, live data
   - 🟡 Dorado (`accent-premium`) = Eliminatorias, Top 8, campeón, premium
   - 🔴 Rojo (`state-danger`) = Errores, predicciones incorrectas
   - ⚫ Surfaces con tinte = Diferenciar tipo de contenido sin usar bordes gruesos

2. **Tamaños mínimos de texto**:
   - NUNCA usar `text-[9px]` o `text-[10px]` para texto que el usuario necesita leer
   - Mínimo: `text-[11px]` para labels terciarios, `text-xs` (12px) para cuerpo, `text-sm` para contenido principal
   - Scores SIEMPRE `text-lg` o más grandes

3. **Superficies con propósito**:
   - Card normal = `surface` (neutro)
   - Card de partido LIVE = `surface-live` (tinte verde + glow)
   - Card de eliminación = `surface-gold` (tinte dorado)
   - Card de predicción correcta = `surface-blue` (tinte azul)
   - Card de predicción incorrecta = `surface-danger` (tinte rojo)

4. **Tabs jerárquicos**:
   - Nivel 1 (Main): Fondo sólido azul cuando activo, sombra
   - Nivel 2 (Filtros): Pills redondos violeta cuando activos, borde
   - Nivel 3 (Toggles): Segmented control oscuro, sin color accent

5. **Espaciado generoso**:
   - Cards: `p-4` mínimo (no `p-3`)
   - Tablas: `py-2` mínimo en celdas (no `py-0.5`)
   - Flags: `text-xl` mínimo (no `text-base`)
   - Gaps entre secciones: `mb-5` / `mb-6`

6. **Mobile-first**:
   - Los scores y flags deben ser legibles en 375px sin zoom
   - Los filtros deben hacer wrap (no scroll horizontal infinito)
   - Los sub-paneles de En Vivo deben ser tap-friendly (mínimo 44px touch targets)

---

## 5. PROMPT LISTO PARA CLI

```
Rediseña la UI visual de FORCH.i ORACLE (Next.js 14 + Tailwind CSS) siguiendo estas instrucciones exactas:

## PALETA DE COLORES
En globals.css :root, actualizar:
- Canvas: #05070B, Surface: #0C1017, Elevated: #151C25, Overlay: #1E2732
- Agregar --raised: #283445
- Border subtle: rgba(255,255,255,0.08), strong: rgba(255,255,255,0.16)
- Accent primary: #3B82F6, agregar accent-secondary: #8B5CF6, accent-emerald: #10B981, accent-premium: #E2B340
- State success: #22C55E, warning: #F59E0B, danger: #EF4444
- Agregar surface tints: --surface-blue: rgba(59,130,246,0.08), --surface-green: rgba(16,185,129,0.08), --surface-gold: rgba(226,179,64,0.08), --surface-red: rgba(239,68,68,0.08), --surface-violet: rgba(139,92,246,0.08)
- Agregar gradients: --gradient-gold, --gradient-live, --gradient-blue
- Agregar shadow-glow-green y shadow-glow-red
- Radii: sm=8px, md=12px, lg=16px, xl=24px

En tailwind.config.ts agregar: accent.secondary, accent.emerald, surface.blue/green/gold/red/violet, raised

## NUEVAS CLASES CSS EN globals.css
Agregar .surface-live (tinte verde + glow + animación livePulse), .surface-gold, .surface-blue, .surface-danger
Agregar @keyframes livePulse (pulse sutil del glow verde)

## JERARQUÍA DE TABS
- Nivel 1 (Main tabs Predicciones/Top8/Bracket): tab activo con bg-accent-primary sólido + shadow-lg
- Nivel 2 (Phase filters): pills rounded-full, activo con bg-accent-secondary/15 + text-accent-secondary + border
- Nivel 3 (Toggles Fecha/Grupo, Partidos/Tablas): segmented control en bg-canvas, activo con bg-raised + shadow-sm

## MATCHCARD (fixture/page.tsx)
- Eliminar match ID del card
- Score en text-lg font-bold con bg-accent-primary/10 px-3 py-1 rounded-lg
- Flags en text-xl
- Equipos en text-sm font-medium, max-w-[140px]
- Eliminatorias usar surface-gold de fondo
- Probabilidad bar h-2.5 con labels text-[11px]
- ConfidenceBadge con ícono (🔥 alta, ⚡ media, ❓ baja) y borde visible

## PÁGINA EN VIVO (live/page.tsx)
- Separar en 3 sub-paneles: "🔴 En Juego" / "✅ Resultados" / "⏳ Pendientes"
- Sub-panel tabs con estilo DIFERENTE a fixture: px-4 py-2.5 rounded-xl, activo con bg-accent-emerald/20 o bg-raised
- Contar matches por categoría en cada tab
- LiveNowPanel: cards con surface-live + glow + score grande text-3xl + minuto animado
- ResultsPanel: accuracy card al inicio con barra de progreso, cada match con surface-green o surface-red según acierto
- UpcomingPanel: lista simple de partidos pendientes

## STANDINGS TABLE
- Texto mínimo text-xs (12px), NUNCA text-[10px]
- Flags text-base
- Clasificados (top 2) con bg-surface-green/30 + dot verde
- DG con color (verde +, rojo -)
- Pts en text-sm font-bold
- py-2 en celdas, max-w-[100px] para nombres

## TOP 8
- Top 3 como podio visual en grid-cols-3 (1ero más grande, surface-gold, text-5xl flag, 🏆)
- 2do y 3ero con surface-blue y medallas 🥈🥉
- Posiciones 4-8 como lista compacta con mini barra

## BRACKET
- BracketCard: surface-blue si played, surface si no
- Scores en text-sm px-2.5 py-0.5 rounded-md
- Winner en bg-accent-primary/15 text-accent-primary
- No-winner en bg-raised text-fg-tertiary
- Flags text-base en bracket cards

## SURFACE COMPONENT (Surface.tsx)
Agregar variantes: 'live', 'gold', 'blue', 'danger' mapeando a las nuevas clases CSS

## REGLAS
- Mínimo text-[11px] para labels, text-xs para cuerpo, text-sm para contenido principal
- Scores SIEMPRE text-lg o más
- Cards p-4 mínimo, tablas py-2 mínimo
- Flags text-xl en cards, text-base en tablas
- Cada tipo de superficie comunica su propósito por color (verde=vivo, dorado=eliminatoria, azul=predicción, rojo=error)
- NO usar el mismo azul (#3B82F6) para tabs, filtros y contenido—usar violeta para sub-navegación, emerald para live, dorado para premium
```
