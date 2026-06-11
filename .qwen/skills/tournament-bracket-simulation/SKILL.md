---
name: tournament-bracket-simulation
description: Pattern for building full tournament bracket simulators that predict every match from group stage to final using AI, with animated UI, tab-based navigation, and premium WC2026 design system
source: auto-skill
extracted_at: '2026-06-09T18:58:41.297Z'
---

# Tournament Bracket Simulation Pattern

When users want to predict an entire tournament (e.g., "who will win the World Cup?") rather than a single match, build a bracket simulator that runs AI predictions for every match in sequence.

## Architecture Overview

```
User triggers simulation
       ↓
Simulate group stage (all matches, round by round)
       ↓
Calculate standings → Identify qualifiers (1st, 2nd, best 3rd)
       ↓
Simulate knockout rounds (R32 → R16 → QF → SF → Final)
       ↓
Return full bracket with champion, runner-up, 3rd, 4th
       ↓
Cache result (2h) to avoid re-simulation
```

## 1. Data Structures

```ts
interface SimulatedMatch {
  id: string;
  round: string;
  roundLabel: string;       // "Octavos de Final", "La Gran Final"
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number;
  awayScore: number;
  winner: string;
  homeWinProb?: number;
  drawProb?: number;
  awayWinProb?: number;
  prediction?: string;      // AI analysis text
}

interface GroupTeamStanding {
  name: string; flag: string; code: string;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDiff: number; points: number;
}

interface TournamentBracket {
  groups: GroupStandings[];
  roundOf32: SimulatedMatch[];
  roundOf16: SimulatedMatch[];
  quarters: SimulatedMatch[];
  semis: SimulatedMatch[];
  thirdPlace: SimulatedMatch;
  final: SimulatedMatch;
  champion: string; championFlag: string;
  runnerUp: string; runnerUpFlag: string;
  thirdPlaceTeam: string; fourthPlaceTeam: string;
  simulatedAt: string;
}
```

## 2. Group Stage Simulation

Process matches **group by group, matchday by matchday** to ensure standings are calculated correctly:

```ts
for (const group of ['A', 'B', 'C', ...]) {
  const groupMatches = getMatchesByGroup(group).sort((a, b) => a.matchday - b.matchday);
  for (const match of groupMatches) {
    const result = await simulateMatch(match);  // AI prediction or real result
    updateStandings(standings, group, match.homeTeam, match.awayTeam, result);
  }
}
```

Sorting rules (FIFA standard):
1. Points (3 for win, 1 for draw)
2. Goal difference
3. Goals scored
4. Head-to-head

## 3. Best 3rd Place Teams — 48-Team World Cup Format

In a 48-team World Cup with 12 groups of 4:
- 12 first-place teams advance automatically
- 12 second-place teams advance automatically
- **8 best 3rd-place teams** advance
- Total: 32 teams in Round of 32

```ts
const thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[] = [];
for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
  const teams = standings.get(letter);
  if (teams && teams.length >= 3) {
    thirdPlaces.push({
      name: teams[2].name, pts: teams[2].points,
      gd: teams[2].goalDiff, gf: teams[2].goalsFor, group: letter
    });
  }
}
thirdPlaces.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf);
const top8Third = thirdPlaces.slice(0, 8);
```

### R32 Matchup Pattern (16 total matches)

```
// 12 matches: 1st place vs 3rd place (based on FIFA bracket mapping)
// 4 matches: 2nd place vs 2nd place (within paired groups)
// Total: 16 matches → 16 winners → Round of 16

const r32Matchups = [
  { home: '1A', away: '3rd-BEFG' },  // 1st A vs best 3rd from B/E/F/G
  { home: '1B', away: '3rd-ABC' },   // etc.
  // ... 12 total 1st-vs-3rd matchups
  { home: '2A', away: '2B' },        // 2nd A vs 2nd B
  { home: '2C', away: '2D' },        // etc.
  // ... 4 total 2nd-vs-2nd matchups
];
```

### Third Place Assignment Function

```ts
function assignThirdPlace(
  criteria: string,        // e.g. "3rd-BEFG"
  top8Third: { name: string; group: string }[]
): string {
  const groups = criteria.replace('3rd-', '').split('');
  for (const tp of top8Third) {
    if (groups.includes(tp.group)) return tp.name;
  }
  return 'TBD';
}
```

## 4. Knockout Bracket Resolution — CRITICAL: Use Same ThirdPlace Array

**Gotcha: TBD cascading through bracket**

After R32, the `resolveTeam` function must use the SAME `top8Third` array throughout R16, QF, and SF. If you pass the original `thirdPlaces` (all 12) instead of `top8Third` (top 8 only), the resolution logic breaks because the third-place criteria won't match.

```ts
// WRONG — causes TBD cascade:
const home = await resolveTeam(h, standings, thirdPlaces, winners);

// CORRECT — use top8Third everywhere after R32 setup:
const home = await resolveTeam(h, standings, top8Third, winners);
```

Also ensure `resolveTeam` signature is consistent:

```ts
async function resolveTeam(
  src: string,
  standings: Map<string, GroupTeamStanding[]>,
  thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[],
  winners: Map<string, string>
): Promise<string> {
  if (src.startsWith('W-')) return winners.get(src) || 'TBD';
  const pos = parseInt(src[0]);
  const g = src[1];
  const t = standings.get(g);
  return t && t[pos - 1] ? t[pos - 1].name : 'TBD';
}
```

**R16 pairing pattern** (symmetrical to R32):

```ts
const r16def = [
  'W-R32-1|W-R32-13',  // (1A/3rd) vs (2A/2B)
  'W-R32-5|W-R32-14',  // (1E/3rd) vs (2C/2D)
  'W-R32-3|W-R32-15',  // (1C/3rd) vs (2E/2F)
  'W-R32-7|W-R32-16',  // (1G/3rd) vs (2G/2H)
  'W-R32-9|W-R32-12',  // (1I/3rd) vs (1L/3rd)
  'W-R32-2|W-R32-10',  // (1B/3rd) vs (1J/3rd)
  'W-R32-6|W-R32-4',   // (1F/3rd) vs (1D/3rd)
  'W-R32-11|W-R32-8',  // (1K/3rd) vs (1H/3rd)
];
```


Use a **source resolution** pattern to track who advances:

```ts
const winners = new Map<string, string>();  // "W-R16-1" → "Brasil"

function resolveTeam(source: string, standings, winners, thirdPlaces): string {
  if (source.startsWith('W-')) return winners.get(source) || 'TBD';
  // "1A" = 1st place of group A, "3CDE" = best 3rd from groups C/D/E
  const position = parseInt(source[0]);
  const group = source[1];
  return standings.get(group)?.[position - 1]?.name || 'TBD';
}

// After each knockout match:
winners.set(`W-${match.id}`, match.winner);
```

**Knockout draw handling**: If scores are equal, simulate penalties:
```ts
if (homeScore === awayScore) {
  winner = Math.random() > 0.5 ? homeTeam : awayTeam;
  prediction += ` (Empate, ${winner} gana en penales)`;
}
```

## 5. API Route with Tournament Caching

Simulating 100+ matches with AI is slow. Cache the entire result:

```ts
const TOURNAMENT_CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours
const tournamentCache = new Map<string, { bracket: unknown; expiresAt: number }>();

export async function POST() {
  const cached = tournamentCache.get('tournament');
  if (cached && Date.now() < cached.expiresAt) {
    return NextResponse.json({ success: true, bracket: cached.bracket, fromCache: true });
  }

  const bracket = await simulateTournament();
  tournamentCache.set('tournament', { bracket, expiresAt: Date.now() + TOURNAMENT_CACHE_MS });
  return NextResponse.json({ success: true, bracket, fromCache: false });
}
```

## 7. Frontend: Tab-Based Fixture View (Mobile-First)

**Problem:** 128 matches on a single page = unusable on mobile. Collapsible sections help but still require too much scrolling.

**Solution:** Tab-based navigation with one phase per view, sticky header, responsive grid.

```tsx
// FixtureView.tsx — Tab-based fixture viewer
type FixtureTab = 'grupos' | 'r32' | 'r16' | 'cuartos' | 'semis' | 'finales';

const TABS = [
  { id: 'grupos', label: 'Grupos', icon: '📋' },
  { id: 'r32', label: '1/16', icon: '🏟️' },
  { id: 'r16', label: 'Octavos', icon: '⚡' },
  { id: 'cuartos', label: 'Cuartos', icon: '🔥' },
  { id: 'semis', label: 'Semis', icon: '💎' },
  { id: 'finales', label: 'Finales', icon: '🏆' },
];

// Sticky tab bar — scrollable on mobile
<div className="sticky top-0 z-50 bg-navy/90 backdrop-blur-xl border-b border-white/5">
  <div className="flex overflow-x-auto">
    {TABS.map(tab => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={activeTab === tab.id ? 'active' : ''}
      >
        {tab.icon} {tab.label}
      </button>
    ))}
  </div>
</div>

// Content with grid responsive
<div className="animate-fade-in" key={activeTab}>
  {activeTab === 'grupos' && (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {bracket.groups.map(g => <GroupCard key={g.group} group={g} />)}
    </div>
  )}
  {activeTab === 'r32' && <BracketPhase matches={bracket.roundOf32} />}
  // ... etc
</div>
```

**Responsive breakpoints:**
| Screen | Group Cards | Bracket Matches |
|--------|-------------|-----------------|
| Mobile (<640px) | 1 col | 1 col |
| Tablet (640-1024px) | 2 col | 2 col |
| Desktop (1024-1280px) | 3 col | 2 col |
| Large (>1280px) | 4 col | 2 col |

**Auto-select finales tab when champion known:**
```tsx
useEffect(() => {
  if (bracket.champion && bracket.champion !== 'TBD') {
    setActiveTab('finales');
  }
}, [bracket.champion]);
```

## 8. Champion Podium Component

```tsx
// ChampionPodium.tsx — Premium champion reveal
function ChampionPodium({ champion, championFlag, runnerUp, runnerUpFlag }) {
  return (
    <>
      {/* Champion */}
      <div className="champion-podium">
        <div className="text-5xl animate-bounce-subtle">{championFlag}</div>
        <h3>🏆 Campeón Mundial 🏆</h3>
        <div className="text-2xl font-black">{champion}</div>
      </div>
      
      {/* Runner up */}
      <div className="glass-card text-center">
        <div className="text-3xl">{runnerUpFlag}</div>
        <h4>Subcampeón</h4>
        <div className="text-lg">{runnerUp}</div>
      </div>
    </>
  );
}
```

## 9. Frontend: Progress Tracking

Long simulations need a progress indicator. Use simulated progress since we can't get real progress from server:

```tsx
const [progress, setProgress] = useState(0);

const progressTimer = setInterval(() => {
  setProgress(p => Math.min(p + Math.random() * 15, 90));
}, 500);

// Show step completion:
<p className={progress > 10 ? 'text-forch-gold' : ''}>
  {progress > 10 ? '✓' : '○'} Simulando fase de grupos...
</p>
<p className={progress > 40 ? 'text-forch-gold' : ''}>
  {progress > 40 ? '✓' : '○'} Calculando clasificados...
</p>
```

## 7. Frontend: Multi-View Layout

Provide view modes for different levels of detail:

| View | Shows |
|------|-------|
| **Champion** | Animated podium (1st-4th) with crown reveal |
| **Bracket** | Full knockout bracket column by column |
| **Groups** | All 12 group standings tables |
| **All** | Everything combined |

## 10. Champion Reveal Animation

Use staggered phase transitions for dramatic effect:

```tsx
const [phase, setPhase] = useState(0);
useEffect(() => {
  setTimeout(() => setPhase(1), 300);   // Champion appears
  setTimeout(() => setPhase(2), 1200);  // Runner-up
  setTimeout(() => setPhase(3), 2000);  // 3rd & 4th
}, []);

<div className={`transition-all duration-700 ${phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
  <span className="text-8xl">{championFlag}</span>
  <h2 className="text-4xl font-black text-forch-gold">{champion}</h2>
</div>
```

## 11. Real Match Results Integration

For matches that have already been played:

```ts
function isMatchPlayed(match: Match): boolean {
  const matchDate = new Date(`${match.date}T${match.time}:00Z`);
  return Date.now() > matchDate.getTime() + MATCH_DURATION_MINUTES * 60 * 1000;
}

// In simulation:
if (isMatchPlayed(match)) {
  // Fetch real score from API-Football
  const realResult = await fetchRealResult(match.id);
  return realResult;
}
// Otherwise, use AI prediction
return await getPrediction(match.homeTeam, match.awayTeam);
```

## 12. Multi-Simulation — Top 8 Champion Probability

A single tournament simulation produces ONE outcome. To show **probabilities**, run the simulation N times (100+) and count how often each team wins:

```ts
export interface ChampionProbability {
  team: string;
  flag: string;
  wins: number;
  pct: number;
}

export async function simulateTournamentMulti(
  numSims = 100,
  realResults: RealMatchResult[] = [],
  onProgress?: (msg: string) => void
): Promise<{ top8: ChampionProbability[]; totalSims: number; bracket: TournamentBracket }> {
  const championCounts = new Map<string, number>();
  let lastBracket: TournamentBracket | null = null;

  for (let i = 0; i < numSims; i++) {
    const standings = await simulateGroups(resultsMap);
    const knockout = await simulateKnockout(standings, resultsMap);
    const champion = knockout.final.winner;

    if (champion && champion !== 'TBD') {
      championCounts.set(champion, (championCounts.get(champion) || 0) + 1);
    }

    // Save last simulation for bracket display
    if (i === numSims - 1) lastBracket = buildBracket(standings, knockout);
  }

  // Build Top 8
  const sorted = Array.from(championCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const totalWins = Array.from(championCounts.values()).reduce((s, v) => s + v, 0);
  const top8 = sorted.map(([team, wins]) => ({
    team,
    flag: getFlag(team),
    wins,
    pct: totalWins > 0 ? Math.round((wins / totalWins) * 1000) / 10 : 0,
  }));

  return { top8, totalSims: numSims, bracket: lastBracket! };
}
```

**UI: Top 8 Ranking Component**

```tsx
// Top8Ranking.tsx
// Props: ChampionProbability[], totalSims

// Features:
// - Animated bars with count-up percentages (eased animation)
// - Rank badges: gold (#1), silver (#2), bronze (#3), gray (4-8)
// - Insight cards: "Favorito principal" + "Dark Horse"
// - Footer: "Las probabilidades se basan en simulaciones estadísticas"
```

**API Response:**

```ts
return NextResponse.json({
  success: true,
  bracket: result.bracket,
  top8: result.top8,
  totalSims: result.totalSims,
});
```

**Why 100 simulations?**
- 10-20: Too noisy — random variance dominates
- 100: Stable enough for top-4, good for 100-run in <30s with Poisson model
- 1000: More precise but slow — only needed for production-grade accuracy

## 13. WC2026 Premium Design System

**Color palette** — Use official World Cup 2026 colors, not generic grays:

```css
:root {
  --wc-navy: #0A1628;        /* Primary background */
  --wc-navy-light: #132238;  /* Card background */
  --wc-blue: #0066FF;        /* Primary action color */
  --wc-blue-glow: #3388FF;   /* Hover/glow state */
  --wc-amber: #FF8C42;       /* Accent/highlight */
  --wc-silver: #8899AA;      /* Muted text */
  --wc-gold: #C9A227;        /* Champion/winner highlight */
  --wc-field: #1A472A;       /* Football field green */
}
```

**Tailwind config:**

```ts
// tailwind.config.ts
const config: Config = {
  theme: {
    extend: {
      colors: {
        wc: {
          navy: '#0A1628', 'navy-light': '#132238',
          blue: '#0066FF', 'blue-glow': '#3388FF',
          amber: '#FF8C42', silver: '#8899AA',
          gold: '#C9A227', field: '#1A472A', white: '#FFFFFF',
        },
      },
    },
  },
};
```

**Background mesh gradient** (animated):

```css
.bg-mesh::before {
  content: '';
  position: absolute;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(0, 102, 255, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(201, 162, 39, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(255, 140, 66, 0.05) 0%, transparent 60%);
  animation: meshFloat 20s ease-in-out infinite;
}
```

**Key visual elements:**

| Element | Style |
|---------|-------|
| Glass card | `backdrop-filter: blur(20px)`, border `rgba(255,255,255,0.08)`, hover lifts +2px |
| Score badge | Blue gradient for normal, gold gradient for winners |
| Tab pill | Underline highlight (`border-bottom-color: var(--wc-blue)`) |
| Button | Gradient blue with `box-shadow: 0 4px 16px rgba(0,102,255,0.3)`, gold variant for CTA |
| Champion podium | Gold gradient border + shimmer animation overlay |
| Animations | `fadeIn`, `slideUp`, `pulseGlow`, `shimmer`, `bounceSubtle` |

**Sticky header with tabs:**

```tsx
<div className="sticky top-0 z-50 bg-wc-navy/90 backdrop-blur-xl border-b border-white/5">
  <div className="flex overflow-x-auto px-2">
    {TABS.map(tab => <button className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`} />)}
  </div>
</div>
```

**Responsive grid for group cards:**

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
```

## 14. Bracket Match Card Component

Compact card for displaying simulated knockout matches:

```tsx
function BracketMatchCard({ match, delay }) {
  return (
    <div className="glass-card p-3 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-wc-silver">{match.roundLabel}</span>
        {match.winner !== 'TBD' && <span className="text-[10px] text-wc-gold">Finalizado</span>}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={match.winner === match.homeTeam ? 'text-wc-gold font-bold' : 'text-white/80'}>
            {match.homeTeam}
          </span>
          <span className={`score-badge ${match.winner === match.homeTeam ? 'gold' : ''}`}>
            {match.homeScore ?? '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className={match.winner === match.awayTeam ? 'text-wc-gold font-bold' : 'text-white/80'}>
            {match.awayTeam}
          </span>
          <span className={`score-badge ${match.winner === match.awayTeam ? 'gold' : ''}`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
```

## 15. Group Card Component

Compact standings card with qualified highlight:

```tsx
function GroupCard({ group }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="bg-gradient-to-r from-wc-blue/20 to-wc-amber/20 px-4 py-2.5 border-b border-white/5">
        <h3 className="text-sm font-bold text-white text-center">GRUPO {group.group}</h3>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-5 text-[9px] text-wc-silver uppercase mb-1.5">
          <span className="col-span-2">Equipo</span>
          <span className="text-center">PJ</span>
          <span className="text-center">DG</span>
          <span className="text-center">Pts</span>
        </div>
        {group.teams.map((team, i) => {
          const isQualified = i < 2 || (i < 4 && team.points >= 4);
          return (
            <div className={`grid grid-cols-5 py-1.5 px-1 rounded-lg ${isQualified ? 'bg-wc-blue/5' : ''}`}>
              <div className="col-span-2 flex items-center gap-2">
                <span>{team.flag}</span>
                <span className="text-xs truncate">{team.name}</span>
              </div>
              <span className="text-center text-xs font-mono">{team.played}</span>
              <span className={`text-center text-xs font-mono ${team.goalDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
              </span>
              <span className="text-center text-xs font-bold text-wc-gold">{team.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

## 16. Analytical Engine Improvements — Altitude + H2H

Modern prediction engines should include these two critical factors:

### Altitude Adjustment

Teams not acclimated to altitude suffer performance reduction. Create a venue database:

```ts
// lib/venues.ts
export const WC2026_VENUES: Record<string, Venue> = {
  'Estadio Azteca': { altitudeM: 2200, category: 'high' },
  'Estadio Akron': { altitudeM: 1560, category: 'moderate' },
  // 13 USA/Canada venues at sea level (3-320m)
};

export function getAltitudeFactor(team: string, venue: string): number {
  // Non-acclimated teams at 2200m: 0.85x (15% reduction)
  // CONCACAF teams: 0.92x (partial acclimation)
  // Acclimated teams (Mexico, Ecuador, Colombia): 1.05-1.08x (bonus)
  // Sea level venues: 1.0x (no effect)
}
```

**Integration into predictor:**
```ts
homeLambda *= getAltitudeFactor(homeTeam, venueName);
awayLambda *= getAltitudeFactor(awayTeam, venueName);
```

### H2H Correlation Engine

Pre-compute historical rivalry data for 50+ classic matchups:

```ts
// lib/h2h.ts
const H2H_DATABASE: Record<string, { wA: number; d: number; wB: number; gA: number; gB: number }> = {
  'Argentina_vs_Brasil': { wA: 28, d: 23, wB: 27, gA: 110, gB: 115 },
  // ...
};

export function computeH2H(teamA: string, teamB: string, eloDiff: number = 0): H2HAdvantage {
  // If data exists: compute win rate differential → factor 0.85-1.15
  // If no data: fallback to Elo-based estimate (0.9-1.1)
}
```

**Integration:**
```ts
const h2h = computeH2H(homeTeam, awayTeam, eloDiff);
homeLambda *= h2h.factor;
awayLambda *= (2 - h2h.factor); // Inverted for away team
```

**Updated prediction pipeline:**
```
1. Baseline: Poisson + Elo + xG
2. Form adjustment
3. Altitude factor (venue-specific)
4. H2H correlation (historical rivalry)
5. Clamp to realistic range (0.3 - 4.0 goals)
6. Poisson probability matrix
```

## Gotchas

| Issue | Solution |
|-------|----------|
| **"TBD" cascades through entire bracket** | 1) Ensure R32 has exactly 16 matches (12× 1st-vs-3rd + 4× 2nd-vs-2nd). 2) Pass `top8Third` (not `thirdPlaces`) to `resolveTeam` in R16/QF/SF. 3) Check `assignThirdPlace` returns actual team names, not "TBD" |
| **R32 has fewer than 16 matches** | Missing matchups cause R16 to reference non-existent winners (W-R32-15, W-R32-16). Must have exactly 16 R32 matches for 32-team knockout |
| **Wrong thirdPlaces array passed to resolveTeam** | After computing `top8Third = thirdPlaces.slice(0, 8)`, ALL calls to `resolveTeam` in R16/QF/SF must use `top8Third`, not the original 12-item array |
| `assignThirdPlace` returns "TBD" | Check that criteria groups (e.g., "BEFG") actually overlap with `top8Third` groups. If no 3rd-place team from those groups made top 8, result is TBD |
| Simulation takes too long | Cache entire tournament result for 2h; show progress UI |
| Group stage order matters | Process matchday by matchday, not all at once |
| 3rd place team mapping is complex | Use FIFA's official bracket mapping for which 3rd places play which 1st places |
| Knockout draws need resolution | Simulate penalties with random winner; note it in prediction text |
| Serverless timeout (50s limit) | If 100+ AI calls, batch parallel calls per group; consider edge runtime |
| Map iteration in TypeScript | Use array of keys instead of `for (const [k,v] of map)` if target < ES2015 |
| 128 matches on mobile = unusable | Use tab-based fixture view (Grupos → 1/16 → Octavos → Cuartos → Semis → Finales) with sticky scrollable tabs |
| Grid too wide on desktop | Use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` for responsive scaling |
