---
name: tournament-bracket-simulation
description: Pattern for building full tournament bracket simulators that predict every match from group stage to final using AI, with animated UI and caching
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

## 3. Best 3rd Place Teams

In a 48-team World Cup, the 8 best 3rd-place teams advance:

```ts
function getBestThirdPlaceTeams(standings): string[] {
  const thirdPlaces = [];
  for (const [group, teams] of standings) {
    const sorted = sortGroupStandings(teams);
    thirdPlaces.push({ name: sorted[2].name, points: sorted[2].points, goalDiff: sorted[2].goalDiff, goalsFor: sorted[2].goalsFor });
  }
  thirdPlaces.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
  return thirdPlaces.slice(0, 8).map(t => t.name);
}
```

## 4. Knockout Bracket Resolution

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

## 6. Frontend: Progress Tracking

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

## 8. Champion Reveal Animation

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

## 9. Real Match Results Integration

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

## 10. Multi-Simulation — Top 8 Champion Probability

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

## Gotchas

| Issue | Solution |
|-------|----------|
| Simulation takes too long | Cache entire tournament result for 2h; show progress UI |
| "TBD" teams cascade through bracket | Check for TBD before calling AI; skip with placeholder match |
| Group stage order matters | Process matchday by matchday, not all at once |
| 3rd place team mapping is complex | Use FIFA's official bracket mapping for which 3rd places play which 1st places |
| Knockout draws need resolution | Simulate penalties with random winner; note it in prediction text |
| Serverless timeout (50s limit) | If 100+ AI calls, batch parallel calls per group; consider edge runtime |
| Map iteration in TypeScript | Use array of keys instead of `for (const [k,v] of map)` if target < ES2015 |
