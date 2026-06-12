// FORCH.i ORACLE — WorldCup26.ir API Client
// Free, open-source API for live World Cup 2026 data
// No API key required for hosted version
// Source: https://github.com/rezarahiminia/worldcup2026

const WC26_BASE_URL = 'https://worldcup26.ir';

// ═══════════════════════════════════════════════════════════════
// TEAM ID → SPANISH NAME MAPPING
// worldcup26.ir uses numeric IDs (1-48), we use Spanish names
// ═══════════════════════════════════════════════════════════════

const TEAM_ID_TO_SPANISH: Record<string, string> = {
  '1': 'México',
  '2': 'Sudáfrica',
  '3': 'Corea del Sur',
  '4': 'Chequia',
  '5': 'Canadá',
  '6': 'Bosnia y Herzegovina',
  '7': 'Qatar',
  '8': 'Suiza',
  '9': 'Brasil',
  '10': 'Marruecos',
  '11': 'Haití',
  '12': 'Escocia',
  '13': 'Estados Unidos',
  '14': 'Paraguay',
  '15': 'Australia',
  '16': 'Turquía',
  '17': 'Alemania',
  '18': 'Curazao',
  '19': 'Costa de Marfil',
  '20': 'Ecuador',
  '21': 'Países Bajos',
  '22': 'Japón',
  '23': 'Suecia',
  '24': 'Túnez',
  '25': 'Bélgica',
  '26': 'Egipto',
  '27': 'Irán',
  '28': 'Nueva Zelanda',
  '29': 'España',
  '30': 'Cabo Verde',
  '31': 'Arabia Saudita',
  '32': 'Uruguay',
  '33': 'Francia',
  '34': 'Senegal',
  '35': 'Irak',
  '36': 'Noruega',
  '37': 'Argentina',
  '38': 'Argelia',
  '39': 'Austria',
  '40': 'Jordania',
  '41': 'Portugal',
  '42': 'RD Congo',
  '43': 'Uzbekistán',
  '44': 'Colombia',
  '45': 'Inglaterra',
  '46': 'Croacia',
  '47': 'Ghana',
  '48': 'Panamá',
};

// Reverse lookup: English name → Spanish name
const ENGLISH_TO_SPANISH: Record<string, string> = {
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Canada': 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Qatar',
  'Switzerland': 'Suiza',
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Scotland': 'Escocia',
  'United States': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  'Turkey': 'Turquía',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
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
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
};

// ═══════════════════════════════════════════════════════════════
// API TYPES
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
  time_elapsed: string; // "not started", "1st half", "2nd half", "finished", etc.
  home_scorers: string; // JSON array string e.g. '{"J. Quiñones 9\'","R. Jiménez 67\'}'
  away_scorers: string;
  group: string; // "A", "B", ... "L"
  matchday: number;
  round_of: string; // "group", "16", "8", "4", "2", "3"
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
  group: string; // group letter
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
  homeTeam: string; // Spanish name
  awayTeam: string; // Spanish name
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
// API FETCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all World Cup 2026 games from worldcup26.ir
 */
export async function fetchWC26Games(): Promise<WC26Game[] | null> {
  try {
    const response = await fetch(`${WC26_BASE_URL}/get/games`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`[worldcup26-api] HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.games || [];
  } catch (err) {
    console.error(`[worldcup26-api] Fetch failed:`, err);
    return null;
  }
}

/**
 * Fetch group standings from worldcup26.ir
 */
export async function fetchWC26Groups(): Promise<Record<string, WC26Group['teams']> | null> {
  try {
    const groups = 'ABCDEFGHIJKL';
    const result: Record<string, WC26Group['teams']> = {};

    // Fetch all 12 groups in parallel
    const promises = groups.split('').map(async (g) => {
      const response = await fetch(`${WC26_BASE_URL}/get/groups/${g}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.group) {
          result[g] = data.group;
        }
      }
    });

    await Promise.all(promises);
    return Object.keys(result).length > 0 ? result : null;
  } catch (err) {
    console.error(`[worldcup26-api] Groups fetch failed:`, err);
    return null;
  }
}

/**
 * Fetch teams from worldcup26.ir
 */
export async function fetchWC26Teams(): Promise<WC26Team[] | null> {
  try {
    const response = await fetch(`${WC26_BASE_URL}/get/teams`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.teams || [];
  } catch (err) {
    console.error(`[worldcup26-api] Teams fetch failed:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// CONVERSION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Convert a worldcup26.ir team ID to Spanish name
 */
export function teamIdToSpanish(teamId: number): string | null {
  return TEAM_ID_TO_SPANISH[String(teamId)] || null;
}

/**
 * Convert a worldcup26.ir English team name to Spanish name
 */
export function teamEnglishToSpanish(englishName: string): string | null {
  return ENGLISH_TO_SPANISH[englishName] || null;
}

/**
 * Parse scorers string from API (JSON array format) into clean array
 * Input: '{"J. Quiñones 9\'","R. Jiménez 67\'}' 
 * Output: ["J. Quiñones 9'", "R. Jiménez 67'"]
 */
function parseScorers(scorersStr: string): string[] {
  if (!scorersStr || scorersStr === '{}' || scorersStr === '[]') return [];
  try {
    // Handle JSON array format
    const cleaned = scorersStr.replace(/^{/, '[').replace(/}$/, ']');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    // Try comma-separated format
    return scorersStr.split(',').map(s => s.trim()).filter(Boolean);
  }
}

/**
 * Map worldcup26.ir round_of to our round format
 */
function mapRound(roundOf: string, group: string): string {
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

/**
 * Convert a worldcup26.ir game to our internal format
 */
export function convertWC26Game(game: WC26Game): ProcessedWC26Match | null {
  const homeTeam = teamIdToSpanish(game.home_team_id);
  const awayTeam = teamIdToSpanish(game.away_team_id);

  if (!homeTeam || !awayTeam) {
    console.warn(`[worldcup26-api] Unmapped team IDs: home=${game.home_team_id}, away=${game.away_team_id}`);
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
    round: mapRound(game.round_of, game.group),
    homeScorers: parseScorers(game.home_scorers),
    awayScorers: parseScorers(game.away_scorers),
    stadium: game.stadium,
    winner,
  };
}

/**
 * Get all finished matches from worldcup26.ir, converted to our format
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
 * Get live matches from worldcup26.ir
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
