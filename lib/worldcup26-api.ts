// FORCH.i ORACLE — World Cup 2026 Data API Client
// Free data sources (no API key required):
//   Primary: wheniskickoff.com/data (static JSON, updated per deploy)
//   Fallback: openfootball/worldcup.json (GitHub CDN, updated 1x/day)
//
// Replaces worldcup26.ir (removed — was causing 504 timeouts)

// ═══════════════════════════════════════════════════════════════
// DATA SOURCE URLS
// ═══════════════════════════════════════════════════════════════

const WHEN_IS_KICKOFF_URL = 'https://wheniskickoff.com/data/v1/matches.json';
const OPENFOOTBALL_URL = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// ═══════════════════════════════════════════════════════════════
// FIFA CODE → SPANISH NAME MAPPING (48 teams)
// ═══════════════════════════════════════════════════════════════

const FIFA_CODE_TO_SPANISH: Record<string, string> = {
  'MEX': 'México',
  'RSA': 'Sudáfrica',
  'KOR': 'Corea del Sur',
  'CZE': 'Chequia',
  'CAN': 'Canadá',
  'BIH': 'Bosnia y Herzegovina',
  'QAT': 'Qatar',
  'SUI': 'Suiza',
  'BRA': 'Brasil',
  'MAR': 'Marruecos',
  'HAI': 'Haití',
  'SCO': 'Escocia',
  'USA': 'Estados Unidos',
  'PAR': 'Paraguay',
  'AUS': 'Australia',
  'TUR': 'Turquía',
  'GER': 'Alemania',
  'CUW': 'Curazao',
  'CIV': 'Costa de Marfil',
  'ECU': 'Ecuador',
  'NED': 'Países Bajos',
  'JPN': 'Japón',
  'SWE': 'Suecia',
  'TUN': 'Túnez',
  'BEL': 'Bélgica',
  'EGY': 'Egipto',
  'IRN': 'Irán',
  'NZL': 'Nueva Zelanda',
  'ESP': 'España',
  'CPV': 'Cabo Verde',
  'KSA': 'Arabia Saudita',
  'URU': 'Uruguay',
  'FRA': 'Francia',
  'SEN': 'Senegal',
  'IRQ': 'Irak',
  'NOR': 'Noruega',
  'ARG': 'Argentina',
  'DZA': 'Argelia',
  'AUT': 'Austria',
  'JOR': 'Jordania',
  'POR': 'Portugal',
  'COD': 'RD Congo',
  'UZB': 'Uzbekistán',
  'COL': 'Colombia',
  'ENG': 'Inglaterra',
  'CRO': 'Croacia',
  'GHA': 'Ghana',
  'PAN': 'Panamá',
};

// FIFA code → numeric ID (for backward-compatible WC26Game interface)
const FIFA_CODE_TO_ID: Record<string, number> = {
  'MEX': 1, 'RSA': 2, 'KOR': 3, 'CZE': 4, 'CAN': 5, 'BIH': 6,
  'QAT': 7, 'SUI': 8, 'BRA': 9, 'MAR': 10, 'HAI': 11, 'SCO': 12,
  'USA': 13, 'PAR': 14, 'AUS': 15, 'TUR': 16, 'GER': 17, 'CUW': 18,
  'CIV': 19, 'ECU': 20, 'NED': 21, 'JPN': 22, 'SWE': 23, 'TUN': 24,
  'BEL': 25, 'EGY': 26, 'IRN': 27, 'NZL': 28, 'ESP': 29, 'CPV': 30,
  'KSA': 31, 'URU': 32, 'FRA': 33, 'SEN': 34, 'IRQ': 35, 'NOR': 36,
  'ARG': 37, 'DZA': 38, 'AUT': 39, 'JOR': 40, 'POR': 41, 'COD': 42,
  'UZB': 43, 'COL': 44, 'ENG': 45, 'CRO': 46, 'GHA': 47, 'PAN': 48,
};

// Reverse: Spanish name → numeric ID (for teamIdToSpanish reverse lookups)
const SPANISH_TO_ID: Record<string, number> = {};
for (const [code, id] of Object.entries(FIFA_CODE_TO_ID)) {
  const spanish = FIFA_CODE_TO_SPANISH[code];
  if (spanish) SPANISH_TO_ID[spanish] = id;
}

// English name → Spanish name (for openfootball fallback)
const ENGLISH_TO_SPANISH: Record<string, string> = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Czechia': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Qatar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  'Turkey': 'Turquía',
  'Turkiye': 'Turquía',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Curaçao': 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos',
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Belgium': 'Bélgica',
  'Egypt': 'Egipto',
  'Iran': 'Irán',
  'New Zealand': 'Nueva Zelanda',
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  'Portugal': 'Portugal',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
};

// ═══════════════════════════════════════════════════════════════
// API TYPES (backward-compatible with existing consumers)
// ═══════════════════════════════════════════════════════════════

export interface WC26Game {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_team_name_en: string;
  away_team_name_en: string;
  home_score: string;
  away_score: string;
  finished: string; // "TRUE" | "FALSE"
  time_elapsed: string;
  home_scorers: string;
  away_scorers: string;
  group: string;
  matchday: number;
  round_of: string;
  stadium: string;
}

export interface WC26Team {
  id: string;
  name_en: string;
  fifa_code: string;
  groups: string;
  flag: string;
}

export interface WC26Group {
  group: string;
  teams: {
    id: number;
    name_en: string;
    flag: string;
    played: number;
    win: number;
    draw: number;
    loss: number;
    goals_for: number;
    goals_against: number;
    goal_diff: number;
    points: number;
    group_order: number;
  }[];
}

export interface ProcessedWC26Match {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
  isLive: boolean;
  timeElapsed: string;
  group: string;
  matchday: number;
  round: string;
  homeScorers: string[];
  awayScorers: string[];
  stadium: string;
  winner: string | 'draw';
}

// ═══════════════════════════════════════════════════════════════
// NAME LOOKUP FUNCTIONS (backward-compatible)
// ═══════════════════════════════════════════════════════════════

/**
 * Convert a numeric team ID to Spanish name (backward-compatible)
 */
export function teamIdToSpanish(teamId: number): string | null {
  for (const [spanish, id] of Object.entries(SPANISH_TO_ID)) {
    if (id === teamId) return spanish;
  }
  return null;
}

/**
 * Convert an English team name to Spanish name
 */
export function teamEnglishToSpanish(englishName: string): string | null {
  return ENGLISH_TO_SPANISH[englishName] || null;
}

/**
 * Convert a FIFA code to Spanish name
 */
export function fifaCodeToSpanish(code: string): string | null {
  return FIFA_CODE_TO_SPANISH[code] || null;
}

// ═══════════════════════════════════════════════════════════════
// DATA SOURCE: wheniskickoff.com (PRIMARY)
// ═══════════════════════════════════════════════════════════════

interface WhenIsKickoffMatch {
  num: number;
  date: string;
  time_utc: string;
  datetime_utc: string;
  home: string | null; // FIFA code or null for knockout TBD
  away: string | null;
  home_name: string;
  away_name: string;
  group: string | null;
  phase: string;
  venue: string;
  venue_name: string;
  venue_city: string;
  slug: string;
  score_home?: number;
  score_away?: number;
  status?: string;
  label?: string;
}

interface WhenIsKickoffResponse {
  meta: { version: string; generated: string; source: string };
  count: number;
  data: WhenIsKickoffMatch[];
}

function mapWhenIsKickoffPhase(phase: string): string {
  switch (phase) {
    case 'group': return 'group';
    case 'last-32': return '16';
    case 'round-of-16': return '8';
    case 'quarter-finals': return '4';
    case 'semi-finals': return '2';
    case 'third-place-play-off': return '3';
    case 'final': return 'final';
    default: return 'group';
  }
}

function convertWhenIsKickoffMatch(match: WhenIsKickoffMatch): WC26Game | null {
  // Skip knockout matches with TBD teams
  if (!match.home || !match.away) return null;

  const homeId = FIFA_CODE_TO_ID[match.home];
  const awayId = FIFA_CODE_TO_ID[match.away];
  if (!homeId || !awayId) return null;

  const isFinished = match.status === 'FINISHED';
  const isLive = match.status === 'LIVE' || match.status === '1H' || match.status === '2H' || match.status === 'HT';

  return {
    id: match.num,
    home_team_id: homeId,
    away_team_id: awayId,
    home_team_name_en: match.home_name,
    away_team_name_en: match.away_name,
    home_score: String(match.score_home ?? 0),
    away_score: String(match.score_away ?? 0),
    finished: isFinished ? 'TRUE' : 'FALSE',
    time_elapsed: isFinished ? 'finished' : isLive ? 'live' : 'not started',
    home_scorers: '[]',
    away_scorers: '[]',
    group: match.group || '',
    matchday: 0, // derived from matchday date logic if needed
    round_of: mapWhenIsKickoffPhase(match.phase),
    stadium: match.venue_name || match.venue_city || '',
  };
}

async function fetchFromWhenIsKickoff(): Promise<WC26Game[] | null> {
  try {
    const response = await fetch(WHEN_IS_KICKOFF_URL, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`[worldcup-api] wheniskickoff HTTP ${response.status}`);
      return null;
    }
    const data: WhenIsKickoffResponse = await response.json();
    const games: WC26Game[] = [];
    for (const match of data.data) {
      const converted = convertWhenIsKickoffMatch(match);
      if (converted) games.push(converted);
    }
    return games.length > 0 ? games : null;
  } catch (err) {
    console.error(`[worldcup-api] wheniskickoff fetch failed:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// DATA SOURCE: openfootball/worldcup.json (FALLBACK)
// ═══════════════════════════════════════════════════════════════

interface OpenFootballGoal {
  name: string;
  minute: string;
  penalty?: boolean;
  owngoal?: boolean;
}

interface OpenFootballMatch {
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: { ft?: number[]; ht?: number[]; et?: number[]; p?: number[] };
  goals1?: OpenFootballGoal[];
  goals2?: OpenFootballGoal[];
  group?: string;
  ground?: string;
  num?: number;
}

interface OpenFootballResponse {
  name: string;
  matches: OpenFootballMatch[];
}

function mapOpenFootballRound(round: string): string {
  if (round.includes('Matchday') || round.includes('Group')) return 'group';
  if (round.includes('Round of 32') || round.includes('last-32')) return '16';
  if (round.includes('Round of 16')) return '8';
  if (round.includes('Quarter')) return '4';
  if (round.includes('Semi')) return '2';
  if (round.includes('third')) return '3';
  return 'final';
}

function extractMatchday(round: string): number {
  const m = round.match(/Matchday\s+(\d+)/i);
  return m ? parseInt(m[1]) : 0;
}

function formatOpenFootballScorers(goals: OpenFootballGoal[] | undefined): string {
  if (!goals || goals.length === 0) return '[]';
  const formatted = goals.map(g => {
    let s = `${g.name} ${g.minute}'`;
    if (g.penalty) s += ' (pen)';
    if (g.owngoal) s += ' (og)';
    return s;
  });
  return JSON.stringify(formatted);
}

function convertOpenFootballMatch(match: OpenFootballMatch, index: number): WC26Game | null {
  // Skip matches with placeholder team names (e.g. "W101", "2A")
  if (!match.team1 || !match.team2) return null;
  if (match.team1.startsWith('W') || match.team1.startsWith('L') || match.team1.startsWith('2')) return null;
  if (match.team2.startsWith('W') || match.team2.startsWith('L') || match.team2.startsWith('2')) return null;
  if (match.team1.match(/^\d[A-L]$/)) return null; // "2A", "3B" etc.
  if (match.team2.match(/^\d[A-L]$/)) return null;

  const homeSpanish = teamEnglishToSpanish(match.team1);
  const awaySpanish = teamEnglishToSpanish(match.team2);
  if (!homeSpanish || !awaySpanish) return null;

  const homeId = SPANISH_TO_ID[homeSpanish];
  const awayId = SPANISH_TO_ID[awaySpanish];
  if (!homeId || !awayId) return null;

  const homeGoals = match.score?.ft?.[0] ?? 0;
  const awayGoals = match.score?.ft?.[1] ?? 0;
  const hasScore = match.score?.ft !== undefined;

  return {
    id: index + 1,
    home_team_id: homeId,
    away_team_id: awayId,
    home_team_name_en: match.team1,
    away_team_name_en: match.team2,
    home_score: String(homeGoals),
    away_score: String(awayGoals),
    finished: hasScore ? 'TRUE' : 'FALSE',
    time_elapsed: hasScore ? 'finished' : 'not started',
    home_scorers: formatOpenFootballScorers(match.goals1),
    away_scorers: formatOpenFootballScorers(match.goals2),
    group: match.group?.replace('Group ', '') || '',
    matchday: extractMatchday(match.round),
    round_of: mapOpenFootballRound(match.round),
    stadium: match.ground || '',
  };
}

async function fetchFromOpenFootball(): Promise<WC26Game[] | null> {
  try {
    const response = await fetch(OPENFOOTBALL_URL, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error(`[worldcup-api] openfootball HTTP ${response.status}`);
      return null;
    }
    const data: OpenFootballResponse = await response.json();
    const games: WC26Game[] = [];
    for (let i = 0; i < data.matches.length; i++) {
      const converted = convertOpenFootballMatch(data.matches[i], i);
      if (converted) games.push(converted);
    }
    return games.length > 0 ? games : null;
  } catch (err) {
    console.error(`[worldcup-api] openfootball fetch failed:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// PUBLIC FETCH FUNCTIONS (backward-compatible interface)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all World Cup 2026 games.
 * Primary: wheniskickoff.com | Fallback: openfootball/worldcup.json
 * Returns WC26Game[] for backward compatibility with existing consumers.
 */
export async function fetchWC26Games(): Promise<WC26Game[] | null> {
  // Try primary source
  const primary = await fetchFromWhenIsKickoff();
  if (primary && primary.length > 0) {
    console.log(`[worldcup-api] Fetched ${primary.length} games from wheniskickoff.com`);
    return primary;
  }

  // Try fallback
  console.log(`[worldcup-api] wheniskickoff unavailable, trying openfootball...`);
  const fallback = await fetchFromOpenFootball();
  if (fallback && fallback.length > 0) {
    console.log(`[worldcup-api] Fetched ${fallback.length} games from openfootball`);
    return fallback;
  }

  console.error(`[worldcup-api] All data sources failed`);
  return null;
}

/**
 * Fetch group standings (not available from these static sources).
 * Returns null — consumers should compute standings from match results.
 */
export async function fetchWC26Groups(): Promise<Record<string, WC26Group['teams']> | null> {
  return null;
}

/**
 * Fetch teams (not available from these static sources).
 * Returns null — consumers should use lib/teams.ts instead.
 */
export async function fetchWC26Teams(): Promise<WC26Team[] | null> {
  return null;
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION UTILITIES (backward-compatible)
// ═══════════════════════════════════════════════════════════════

/**
 * Convert a WC26Game to our internal processed format
 */
export function convertWC26Game(game: WC26Game): ProcessedWC26Match | null {
  const homeTeam = teamIdToSpanish(game.home_team_id);
  const awayTeam = teamIdToSpanish(game.away_team_id);

  if (!homeTeam || !awayTeam) {
    console.warn(`[worldcup-api] Unmapped team IDs: home=${game.home_team_id}, away=${game.away_team_id}`);
    return null;
  }

  const homeScore = parseInt(game.home_score) || 0;
  const awayScore = parseInt(game.away_score) || 0;
  const isFinished = game.finished === 'TRUE';
  const isLive = !isFinished && game.time_elapsed !== 'not started' && game.time_elapsed !== 'notstarted';

  let winner: string | 'draw' = 'draw';
  if (isFinished) {
    winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'draw';
  }

  return {
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    isFinished,
    isLive,
    timeElapsed: game.time_elapsed,
    group: game.group,
    matchday: game.matchday,
    round: mapRoundFromLegacy(game.round_of),
    homeScorers: parseScorers(game.home_scorers),
    awayScorers: parseScorers(game.away_scorers),
    stadium: game.stadium,
    winner,
  };
}

function mapRoundFromLegacy(roundOf: string): string {
  switch (roundOf) {
    case 'group': return 'group';
    case '16': return 'round-32';
    case '8': return 'round-16';
    case '4': return 'quarter';
    case '2': return 'semi';
    case '3': return 'third';
    default: return 'final';
  }
}

function parseScorers(scorersStr: string): string[] {
  if (!scorersStr || scorersStr === '{}' || scorersStr === '[]') return [];
  try {
    const parsed = JSON.parse(scorersStr);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return scorersStr.split(',').map(s => s.trim()).filter(Boolean);
  }
}

/**
 * Get all finished matches, converted to internal format
 */
export async function getFinishedMatches(): Promise<ProcessedWC26Match[]> {
  const games = await fetchWC26Games();
  if (!games) return [];

  const processed: ProcessedWC26Match[] = [];
  for (const game of games) {
    if (game.finished !== 'TRUE') continue;
    const converted = convertWC26Game(game);
    if (converted) processed.push(converted);
  }
  return processed;
}

/**
 * Get live matches
 */
export async function getLiveMatches(): Promise<ProcessedWC26Match[]> {
  const games = await fetchWC26Games();
  if (!games) return [];

  const processed: ProcessedWC26Match[] = [];
  for (const game of games) {
    if (game.finished === 'TRUE' || game.time_elapsed === 'not started') continue;
    const converted = convertWC26Game(game);
    if (converted) processed.push(converted);
  }
  return processed;
}
