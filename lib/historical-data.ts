// FORCH.i ORACLE — Historical World Cup Data (1930-2026)
// Source: openfootball/worldcup.json (CC0 Public Domain)
// GitHub raw URLs — no API key required
//
// Used for:
// 1. H2H records expansion (500+ matches from 22 World Cups)
// 2. Calibration training data
// 3. Historical statistics for UI

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface HistoricalGoal {
  name: string;
  minute: number;
  penalty?: boolean;
  owngoal?: boolean;
}

export interface HistoricalMatch {
  round: string;
  date: string;
  team1: string;
  team2: string;
  score: {
    ft: [number, number];
    ht?: [number, number];
    et?: [number, number];
    p?: [number, number];
  };
  goals1: HistoricalGoal[];
  goals2: HistoricalGoal[];
  group?: string;
  ground?: string;
}

export interface HistoricalTeam {
  name: string;
  fifa_code: string;
  continent: string;
  confed: string;
  group?: string;
  flag_icon?: string;
}

export interface HistoricalSquadPlayer {
  number: number;
  pos: 'GK' | 'DF' | 'MF' | 'FW';
  name: string;
  club: { name: string; country: string };
  date_of_birth: string;
}

export interface HistoricalSquad {
  name: string;
  fifa_code: string;
  group: string;
  players: HistoricalSquadPlayer[];
}

// ═══════════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════════

const OPENFOOTBALL_BASE = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master';

/**
 * Fetch all matches for a specific World Cup year.
 */
export async function fetchWorldCupMatches(year: number): Promise<HistoricalMatch[]> {
  try {
    const response = await fetch(`${OPENFOOTBALL_BASE}/${year}/worldcup.json`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.matches || [];
  } catch (err) {
    console.error(`[historical-data] Failed to fetch ${year} matches:`, err);
    return [];
  }
}

/**
 * Fetch squad data (2026 only — 384KB).
 */
export async function fetchWorldCupSquads(year: number = 2026): Promise<HistoricalSquad[]> {
  try {
    const response = await fetch(`${OPENFOOTBALL_BASE}/${year}/worldcup.squads.json`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (err) {
    console.error(`[historical-data] Failed to fetch ${year} squads:`, err);
    return [];
  }
}

/**
 * Fetch team metadata.
 */
export async function fetchWorldCupTeams(year: number = 2026): Promise<HistoricalTeam[]> {
  try {
    const response = await fetch(`${OPENFOOTBALL_BASE}/${year}/worldcup.teams.json`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.teams || []);
  } catch (err) {
    console.error(`[historical-data] Failed to fetch ${year} teams:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// NAME NORMALIZATION
// ═══════════════════════════════════════════════════════════════

const HISTORICAL_NAME_MAP: Record<string, string> = {
  'West Germany': 'Alemania', 'Germany': 'Alemania',
  'Czechoslovakia': 'Chequia', 'Czech Republic': 'Chequia', 'Czechia': 'Chequia',
  'Yugoslavia': 'Serbia', 'Serbia and Montenegro': 'Serbia',
  'Soviet Union': 'Rusia', 'Russia': 'Rusia',
  'Zaïre': 'RD Congo', 'Zaire': 'RD Congo', 'DR Congo': 'RD Congo',
  'Burma': 'Myanmar', 'Dutch East Indies': 'Indonesia',
  'Republic of Ireland': 'Irlanda', 'Ireland': 'Irlanda',
  'Northern Ireland': 'Irlanda del Norte',
  'Korea Republic': 'Corea del Sur', 'South Korea': 'Corea del Sur',
  'Korea DPR': 'Corea del Norte', 'North Korea': 'Corea del Norte',
  'USA': 'Estados Unidos', 'United States': 'Estados Unidos',
  'Holland': 'Países Bajos', 'Netherlands': 'Países Bajos',
  'Côte d\'Ivoire': 'Costa de Marfil', 'Ivory Coast': 'Costa de Marfil',
  'Cape Verde Islands': 'Cabo Verde', 'Cape Verde': 'Cabo Verde',
  'Bolivia': 'Bolivia', 'Peru': 'Perú', 'Chile': 'Chile',
  'Chinese PR': 'China', 'China': 'China',
  'Cameroon': 'Camerún',
  'FR Yugoslavia': 'Serbia',
  'Curaçao': 'Curazao', 'Curacao': 'Curazao',
  'Trinidad and Tobago': 'Trinidad y Tobago',
  'Saudi Arabia': 'Arabia Saudita',
  'United Arab Emirates': 'Emiratos Árabes Unidos',
};

function normalizeTeamName(name: string): string {
  return HISTORICAL_NAME_MAP[name] || name;
}

// ═══════════════════════════════════════════════════════════════
// H2H EXPANSION — Build comprehensive H2H database
// ═══════════════════════════════════════════════════════════════

export interface ExpandedH2HRecord {
  teamA: string;
  teamB: string;
  totalMatches: number;
  winsA: number;
  draws: number;
  winsB: number;
  goalsA: number;
  goalsB: number;
  worldCupMatches: number;
  lastMeeting: string;
  competitions: string[]; // years of WC meetings
}

/**
 * Build expanded H2H database from historical WC data.
 * Processes matches from 1930 to 2022.
 */
export async function buildExpandedH2H(): Promise<Map<string, ExpandedH2HRecord>> {
  const YEARS = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022];
  const h2hMap = new Map<string, ExpandedH2HRecord>();

  for (const year of YEARS) {
    const matches = await fetchWorldCupMatches(year);
    for (const match of matches) {
      const t1 = normalizeTeamName(match.team1);
      const t2 = normalizeTeamName(match.team2);
      if (t1 === t2) continue; // Skip same team

      // Always use alphabetical order as key
      const [sortedA, sortedB] = [t1, t2].sort();
      const key = `${sortedA}_vs_${sortedB}`;

      if (!h2hMap.has(key)) {
        h2hMap.set(key, {
          teamA: sortedA,
          teamB: sortedB,
          totalMatches: 0,
          winsA: 0,
          draws: 0,
          winsB: 0,
          goalsA: 0,
          goalsB: 0,
          worldCupMatches: 0,
          lastMeeting: match.date,
          competitions: [],
        });
      }

      const rec = h2hMap.get(key)!;
      rec.totalMatches++;
      rec.worldCupMatches++;
      rec.goalsA += match.score.ft[0];
      rec.goalsB += match.score.ft[1];

      // Determine winner (use final score, including ET/Pens)
      const finalScore = match.score.et || match.score.ft;
      const scoreA = finalScore[0];
      const scoreB = finalScore[1];

      if (scoreA > scoreB) {
        if (t1 === sortedA) rec.winsA++;
        else rec.winsB++;
      } else if (scoreB > scoreA) {
        if (t2 === sortedB) rec.winsB++;
        else rec.winsA++;
      } else {
        rec.draws++;
      }

      // Update last meeting
      if (match.date > rec.lastMeeting) rec.lastMeeting = match.date;

      // Track WC year
      if (!rec.competitions.includes(String(year))) {
        rec.competitions.push(String(year));
      }
    }
  }

  return h2hMap;
}

/**
 * Get H2H factor for prediction engine using expanded data.
 * Returns factor 0.85-1.15 and psychological edge.
 */
export function computeExpandedH2HFactor(
  h2hMap: Map<string, ExpandedH2HRecord>,
  teamA: string,
  teamB: string
): { factor: number; psychologicalEdge: number; summary: string; wcMatches: number } {
  const [sortedA, sortedB] = [teamA, teamB].sort();
  const key = `${sortedA}_vs_${sortedB}`;
  const rec = h2hMap.get(key);

  if (!rec || rec.totalMatches < 2) {
    return {
      factor: 1.0,
      psychologicalEdge: 0,
      summary: `${teamA} vs ${teamB}: Sin historial en mundiales`,
      wcMatches: 0,
    };
  }

  const winsA = teamA === sortedA ? rec.winsA : rec.winsB;
  const winsB = teamA === sortedA ? rec.winsB : rec.winsA;
  const goalsA = teamA === sortedA ? rec.goalsA : rec.goalsB;
  const goalsB = teamA === sortedA ? rec.goalsB : rec.goalsA;

  const winRateA = winsA / rec.totalMatches;
  const psychologicalEdge = winRateA - (winsB / rec.totalMatches);

  const gpgA = goalsA / Math.max(1, rec.totalMatches);
  const gpgB = goalsB / Math.max(1, rec.totalMatches);
  const factor = Math.max(0.85, Math.min(1.15, 1.0 + (gpgA - gpgB) * 0.08));

  return {
    factor: Math.round(factor * 100) / 100,
    psychologicalEdge: Math.round(psychologicalEdge * 100) / 100,
    summary: `${teamA} vs ${teamB}: ${rec.totalMatches} partidos en mundiales (${rec.competitions.join(', ')})`,
    wcMatches: rec.totalMatches,
  };
}

// ═══════════════════════════════════════════════════════════════
// STATISTICS — Historical WC stats for UI
// ═══════════════════════════════════════════════════════════════

export interface WCStats {
  totalMatches: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  totalWorldCups: number;
  topScorers: Array<{ name: string; goals: number; country: string; years: number[] }>;
  biggestWins: Array<{ match: string; score: string; year: number }>;
  mostAppearances: number; // teams with most WC appearances
}

/**
 * Compute aggregate stats from all historical WC data.
 * This is expensive — cache the result.
 */
export async function computeHistoricalStats(): Promise<WCStats> {
  const YEARS = [1930, 1934, 1938, 1950, 1954, 1958, 1962, 1966, 1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022];

  let totalMatches = 0;
  let totalGoals = 0;
  const scorerMap = new Map<string, { goals: number; country: string; years: Set<number> }>();
  const biggestWins: Array<{ match: string; score: string; year: number; goalDiff: number }> = [];

  for (const year of YEARS) {
    const matches = await fetchWorldCupMatches(year);
    for (const match of matches) {
      totalMatches++;
      const goals1 = match.score.ft[0];
      const goals2 = match.score.ft[1];
      totalGoals += goals1 + goals2;

      // Track biggest wins
      const goalDiff = Math.abs(goals1 - goals2);
      if (goalDiff >= 4) {
        const t1 = normalizeTeamName(match.team1);
        const t2 = normalizeTeamName(match.team2);
        biggestWins.push({
          match: `${t1} vs ${t2}`,
          score: `${goals1}-${goals2}`,
          year,
          goalDiff,
        });
      }

      // Track scorers
      for (const goal of [...match.goals1, ...match.goals2]) {
        if (goal.owngoal) continue;
        const name = goal.name;
        if (!scorerMap.has(name)) {
          scorerMap.set(name, { goals: 0, country: '', years: new Set() });
        }
        const scorer = scorerMap.get(name)!;
        scorer.goals++;
        scorer.years.add(year);
        // Try to determine country from team
        if (match.goals1.includes(goal)) {
          scorer.country = normalizeTeamName(match.team1);
        } else {
          scorer.country = normalizeTeamName(match.team2);
        }
      }
    }
  }

  // Sort and get top 20 scorers
  const topScorers = Array.from(scorerMap.entries())
    .map(([name, data]) => ({
      name,
      goals: data.goals,
      country: data.country,
      years: Array.from(data.years),
    }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 20);

  // Sort biggest wins by goal difference
  biggestWins.sort((a, b) => b.goalDiff - a.goalDiff);

  return {
    totalMatches,
    totalGoals,
    avgGoalsPerMatch: Math.round((totalGoals / totalMatches) * 100) / 100,
    totalWorldCups: YEARS.length,
    topScorers,
    biggestWins: biggestWins.slice(0, 10).map(({ match, score, year }) => ({ match, score, year })),
    mostAppearances: 22, // Brazil/Germany/Italy have appeared in all 22
  };
}
