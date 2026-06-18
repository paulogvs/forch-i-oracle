// FORCH.i ORACLE — ESPN Public API Client
// Free, no API key required
// Source: https://github.com/pseudo-r/Public-ESPN-API
// Covers: live scores, standings, odds, play-by-play, rosters, injuries

const ESPN_SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const ESPN_CORE = 'https://sports.core.api.espn.com/v2/sports/soccer/leagues/fifa.world';
const ESPN_STANDINGS = 'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world/standings';

// ═══════════════════════════════════════════════════════════════
// TEAM NAME NORMALIZATION (ESPN English → Spanish)
// ═══════════════════════════════════════════════════════════════

const ESPN_TO_SPANISH: Record<string, string> = {
  'Mexico': 'México', 'South Africa': 'Sudáfrica', 'South Korea': 'Corea del Sur',
  'Czechia': 'Chequia', 'Czech Republic': 'Chequia', 'Canada': 'Canadá',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina', 'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Qatar', 'Switzerland': 'Suiza', 'Brazil': 'Brasil', 'Morocco': 'Marruecos',
  'Haiti': 'Haití', 'Scotland': 'Escocia', 'United States': 'Estados Unidos',
  'USA': 'Estados Unidos', 'Paraguay': 'Paraguay', 'Australia': 'Australia',
  'Turkey': 'Turquía', 'Türkiye': 'Turquía', 'Germany': 'Alemania',
  'Curacao': 'Curazao', 'Curaçao': 'Curazao', 'Ivory Coast': 'Costa de Marfil',
  'Ecuador': 'Ecuador', 'Netherlands': 'Países Bajos', 'Japan': 'Japón',
  'Sweden': 'Suecia', 'Tunisia': 'Túnez', 'Belgium': 'Bélgica', 'Egypt': 'Egipto',
  'Iran': 'Irán', 'New Zealand': 'Nueva Zelanda', 'Spain': 'España',
  'Cape Verde': 'Cabo Verde', 'Saudi Arabia': 'Arabia Saudita', 'Uruguay': 'Uruguay',
  'France': 'Francia', 'Senegal': 'Senegal', 'Iraq': 'Irak', 'Norway': 'Noruega',
  'Argentina': 'Argentina', 'Algeria': 'Argelia', 'Austria': 'Austria',
  'Jordan': 'Jordania', 'Portugal': 'Portugal', 'DR Congo': 'RD Congo',
  'Uzbekistan': 'Uzbekistán', 'Colombia': 'Colombia', 'England': 'Inglaterra',
  'Croatia': 'Croacia', 'Ghana': 'Ghana', 'Panama': 'Panamá',
  'Korea Republic': 'Corea del Sur', 'Korea DPR': 'Corea del Norte',
};

// Reverse: Spanish → ESPN abbreviation
const SPANISH_TO_ESPN_ABBR: Record<string, string> = {
  'México': 'MEX', 'Sudáfrica': 'RSA', 'Corea del Sur': 'KOR', 'Chequia': 'CZE',
  'Canadá': 'CAN', 'Bosnia y Herzegovina': 'BIH', 'Qatar': 'QAT', 'Suiza': 'SUI',
  'Brasil': 'BRA', 'Marruecos': 'MAR', 'Haití': 'HTI', 'Escocia': 'SCO',
  'Estados Unidos': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turquía': 'TUR',
  'Alemania': 'GER', 'Curazao': 'CUW', 'Costa de Marfil': 'CIV', 'Ecuador': 'ECU',
  'Países Bajos': 'NED', 'Japón': 'JPN', 'Suecia': 'SWE', 'Túnez': 'TUN',
  'Bélgica': 'BEL', 'Egipto': 'EGY', 'Irán': 'IRN', 'Nueva Zelanda': 'NZL',
  'España': 'ESP', 'Cabo Verde': 'CPV', 'Arabia Saudita': 'KSA', 'Uruguay': 'URU',
  'Francia': 'FRA', 'Senegal': 'SEN', 'Irak': 'IRQ', 'Noruega': 'NOR',
  'Argentina': 'ARG', 'Argelia': 'ALG', 'Austria': 'AUT', 'Jordania': 'JOR',
  'Portugal': 'POR', 'RD Congo': 'COD', 'Uzbekistán': 'UZB', 'Colombia': 'COL',
  'Inglaterra': 'ENG', 'Croacia': 'CRO', 'Ghana': 'GHA', 'Panamá': 'PAN',
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ESPNScoreboardEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    clock: number;
    displayClock: string;
    period: number;
    type: {
      id: string;
      name: string;
      state: 'pre' | 'in' | 'post';
      completed: boolean;
      description: string;
      detail: string;
    };
  };
  competitions: [{
    id: string;
    competitors: Array<{
      homeAway: 'home' | 'away';
      team: {
        id: string;
        abbreviation: string;
        displayName: string;
        shortDisplayName: string;
        logo: string;
        color: string;
      };
      score: string;
      winner: boolean;
      form?: string;
      statistics?: Array<{
        name: string;
        abbreviation: string;
        displayValue: string;
      }>;
      leaders?: Array<{
        name: string;
        leaders: Array<{
          displayValue: string;
          value: number;
          athlete: {
            displayName: string;
            headshot?: string;
          };
        }>;
      }>;
    }>;
    details?: Array<{
      type: { text: string };
      clock: { displayValue: string };
      team: { id: string };
      scoreValue: number;
      scoringPlay: boolean;
      redCard: boolean;
      yellowCard: boolean;
      penaltyKick: boolean;
      ownGoal: boolean;
      athletesInvolved: Array<{
        displayName: string;
        position: string;
      }>;
    }>;
    odds?: Array<{
      overUnder: number;
      moneyline?: {
        home?: { odds: string };
        away?: { odds: string };
        draw?: { odds: string };
      };
      total?: {
        over?: { current: { line: string; odds: string } };
        under?: { current: { line: string; odds: string } };
      };
    }>;
    venue?: {
      fullName: string;
      address: { city: string; country: string };
    };
  }];
}

export interface ESPNStandingsEntry {
  team: { id: string; abbreviation: string; displayName: string; logo: string };
  stats: Array<{ name: string; value: number }>;
}

// ═══════════════════════════════════════════════════════════════
// SCOREBOARD — Live scores + fixtures
// ═══════════════════════════════════════════════════════════════

export async function fetchESPNScoreboard(date?: string): Promise<ESPNScoreboardEvent[]> {
  try {
    const url = date
      ? `${ESPN_SITE}/scoreboard?dates=${date}`
      : `${ESPN_SITE}/scoreboard`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error(`[espn-api] Scoreboard HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.events || [];
  } catch (err) {
    console.error(`[espn-api] Scoreboard fetch failed:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// STANDINGS — Group tables
// ═══════════════════════════════════════════════════════════════

export interface ESPNGroupStanding {
  group: string;
  teams: Array<{
    name: string;
    abbreviation: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
    points: number;
    position: number;
  }>;
}

export async function fetchESPNStandings(): Promise<ESPNGroupStanding[]> {
  try {
    const response = await fetch(ESPN_STANDINGS, {
      signal: AbortSignal.timeout(10000),
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      console.error(`[espn-api] Standings HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();
    const groups: ESPNGroupStanding[] = [];

    if (data.children) {
      for (const child of data.children) {
        const groupName = child.name?.replace('Group ', '') || '?';
        const teams = (child.entries || []).map((entry: ESPNStandingsEntry) => {
          const statsMap: Record<string, number> = {};
          for (const s of entry.stats) statsMap[s.name] = s.value;
          return {
            name: entry.team.displayName,
            abbreviation: entry.team.abbreviation,
            played: statsMap['gamesPlayed'] || 0,
            won: statsMap['wins'] || 0,
            drawn: statsMap['ties'] || 0,
            lost: statsMap['losses'] || 0,
            goalsFor: statsMap['pointsFor'] || 0,
            goalsAgainst: statsMap['pointsAgainst'] || 0,
            goalDifference: statsMap['pointDifferential'] || 0,
            points: statsMap['points'] || 0,
            position: statsMap['rank'] || 0,
          };
        });
        groups.push({ group: groupName, teams });
      }
    }

    return groups;
  } catch (err) {
    console.error(`[espn-api] Standings fetch failed:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// ODDS — DraftKings moneyline + over/under
// ═══════════════════════════════════════════════════════════════

export interface ESPNMatchOdds {
  eventId: string;
  homeWinOdds: string | null;
  awayWinOdds: string | null;
  drawOdds: string | null;
  overUnder: number | null;
  homeSpread: { line: string; odds: string } | null;
  awaySpread: { line: string; odds: string } | null;
}

/**
 * Convert American moneyline odds to implied probability.
 * Example: -150 → 60%, +200 → 33.3%
 */
export function americanToImpliedProbability(americanOdds: string): number {
  const odds = parseInt(americanOdds.replace(/[+-]/, ''));
  if (isNaN(odds)) return 0;
  if (americanOdds.startsWith('-')) {
    return odds / (odds + 100); // favorite
  }
  return 100 / (odds + 100); // underdog
}

/**
 * Convert implied probability to European decimal odds.
 */
export function impliedProbabilityToDecimal(prob: number): number {
  if (prob <= 0) return 99;
  return Math.round((1 / prob) * 100) / 100;
}

export function extractOddsFromEvent(event: ESPNScoreboardEvent): ESPNMatchOdds | null {
  const comp = event.competitions?.[0];
  const oddsArr = comp?.odds;
  if (!oddsArr || oddsArr.length === 0) return null;

  const odds = oddsArr[0];
  return {
    eventId: event.id,
    homeWinOdds: odds.moneyline?.home?.odds || null,
    awayWinOdds: odds.moneyline?.away?.odds || null,
    drawOdds: odds.moneyline?.draw?.odds || null,
    overUnder: odds.overUnder || null,
    homeSpread: null, // pointSpread varies by event, accessed dynamically
    awaySpread: null,
  };
}

/**
 * Convert ESPN odds to our 1X2 probability format (0-100).
 * Returns null if odds are missing.
 */
export function oddsToProbabilities(odds: ESPNMatchOdds): { homeWin: number; draw: number; awayWin: number } | null {
  if (!odds.homeWinOdds || !odds.awayWinOdds || !odds.drawOdds) return null;

  const homeProb = americanToImpliedProbability(odds.homeWinOdds);
  const drawProb = americanToImpliedProbability(odds.drawOdds);
  const awayProb = americanToImpliedProbability(odds.awayWinOdds);

  // Normalize to 100 (remove bookmaker margin/vig)
  const total = homeProb + drawProb + awayProb;
  if (total <= 0) return null;

  return {
    homeWin: Math.round((homeProb / total) * 100),
    draw: Math.round((drawProb / total) * 100),
    awayWin: Math.round((awayProb / total) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// PLAY-BY-PLAY — Match events (goals, cards, subs)
// ═══════════════════════════════════════════════════════════════

export interface ESPNPlay {
  type: { text: string };
  clock: { value: number; displayValue: string };
  team: { id: string };
  scoreValue: number;
  scoringPlay: boolean;
  redCard: boolean;
  yellowCard: boolean;
  penaltyKick: boolean;
  ownGoal: boolean;
  athletesInvolved: Array<{
    displayName: string;
    position: string;
    headshot?: string;
  }>;
}

export async function fetchESPNPlayByPlay(eventId: string): Promise<ESPNPlay[]> {
  try {
    const response = await fetch(
      `${ESPN_CORE}/events/${eventId}/competitions/${eventId}/plays?limit=300`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error(`[espn-api] Play-by-play fetch failed:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// TEAM ROSTER
// ═══════════════════════════════════════════════════════════════

export interface ESPNPlayer {
  id: string;
  displayName: string;
  jersey: string;
  position: string;
  headshot?: string;
  nationality?: string;
  age?: number;
}

export async function fetchESPNTeamRoster(teamAbbr: string): Promise<ESPNPlayer[]> {
  try {
    // Find ESPN team ID from abbreviation
    const teamsResponse = await fetch(`${ESPN_SITE}/teams`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!teamsResponse.ok) return [];

    const teamsData = await teamsResponse.json();
    const team = (teamsData.sports?.[0]?.leagues?.[0]?.teams || [])
      .find((t: { team: { abbreviation: string } }) =>
        t.team.abbreviation.toLowerCase() === teamAbbr.toLowerCase()
      );

    if (!team) return [];

    const rosterResponse = await fetch(
      `${ESPN_SITE}/teams/${team.team.id}/roster`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!rosterResponse.ok) return [];

    const rosterData = await rosterResponse.json();
    const players: ESPNPlayer[] = [];

    for (const cat of rosterData.leagues?.[0]?.athletes || []) {
      for (const p of cat.items || []) {
        players.push({
          id: p.id,
          displayName: p.displayName,
          jersey: p.jersey || '',
          position: p.position?.abbreviation || '',
          headshot: p.headshot?.href,
          nationality: p.citizenship,
          age: p.age,
        });
      }
    }

    return players;
  } catch (err) {
    console.error(`[espn-api] Roster fetch failed:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// INJURIES
// ═══════════════════════════════════════════════════════════════

export interface ESPNInjury {
  athlete: { displayName: string; headshot?: string };
  status: string;
  details: { detail: string; returnDate?: string };
}

export async function fetchESPNInjuries(teamAbbr: string): Promise<ESPNInjury[]> {
  try {
    const teamsResponse = await fetch(`${ESPN_SITE}/teams`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!teamsResponse.ok) return [];

    const teamsData = await teamsResponse.json();
    const team = (teamsData.sports?.[0]?.leagues?.[0]?.teams || [])
      .find((t: { team: { abbreviation: string } }) =>
        t.team.abbreviation.toLowerCase() === teamAbbr.toLowerCase()
      );

    if (!team) return [];

    const injResponse = await fetch(
      `${ESPN_SITE}/teams/${team.team.id}/injuries`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!injResponse.ok) return [];

    const injData = await injResponse.json();
    return (injData.injuries || []).map((i: ESPNInjury) => ({
      athlete: i.athlete,
      status: i.status,
      details: i.details,
    }));
  } catch (err) {
    console.error(`[espn-api] Injuries fetch failed:`, err);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// TEAM NAME CONVERSION HELPERS
// ═══════════════════════════════════════════════════════════════

export function espnNameToSpanish(englishName: string): string {
  return ESPN_TO_SPANISH[englishName] || englishName;
}

export function spanishToESPNAbbreviation(spanishName: string): string {
  return SPANISH_TO_ESPN_ABBR[spanishName] || '';
}

// ═══════════════════════════════════════════════════════════════
// COMBINED: Scoreboard → Our Processed Format
// ═══════════════════════════════════════════════════════════════

export interface ProcessedESPNMatch {
  espnEventId: string;
  homeTeam: string; // Spanish
  awayTeam: string; // Spanish
  homeScore: number;
  awayScore: number;
  isFinished: boolean;
  isLive: boolean;
  isScheduled: boolean;
  timeElapsed: string;
  group: string;
  venue: string;
  city: string;
  homeScorers: string[];
  awayScorers: string[];
  homePossession: number | null;
  awayPossession: number | null;
  homeShotsOnTarget: number | null;
  awayShotsOnTarget: number | null;
  odds: ESPNMatchOdds | null;
}

function parseESPNScorers(details: ESPNScoreboardEvent['competitions'][0]['details'] | undefined, teamId: string): string[] {
  if (!details) return [];
  return details
    .filter(d => d.scoringPlay && String(d.team?.id) === String(teamId))
    .map(d => {
      const scorer = d.athletesInvolved?.[0]?.displayName || 'Unknown';
      const minute = d.clock?.displayValue || '';
      const pen = d.penaltyKick ? ' (pen)' : '';
      const og = d.ownGoal ? ' (OG)' : '';
      return `${scorer} ${minute}${pen}${og}`;
    });
}

export function processESPNScoreboard(events: ESPNScoreboardEvent[]): ProcessedESPNMatch[] {
  return events.map(event => {
    const comp = event.competitions[0];
    const homeComp = comp.competitors.find(c => c.homeAway === 'home');
    const awayComp = comp.competitors.find(c => c.homeAway === 'away');

    const homeTeam = espnNameToSpanish(homeComp?.team?.displayName || '');
    const awayTeam = espnNameToSpanish(awayComp?.team?.displayName || '');

    const homeScore = parseInt(homeComp?.score || '0') || 0;
    const awayScore = parseInt(awayComp?.score || '0') || 0;

    const state = event.status.type.state;
    const isFinished = state === 'post' || event.status.type.completed;
    const isLive = state === 'in';
    const isScheduled = state === 'pre';

    // Extract group from competition name/notes
    const eventName = event.name || '';
    const groupMatch = eventName.match(/Group ([A-L])/i) || (comp as any).altGameNote?.match(/Group ([A-L])/i);
    const group = groupMatch ? groupMatch[1] : '';

    // Extract possession from statistics
    const homePoss = homeComp?.statistics?.find(s => s.name === 'possessionPct');
    const awayPoss = awayComp?.statistics?.find(s => s.name === 'possessionPct');
    const homeSOT = homeComp?.statistics?.find(s => s.name === 'shotsOnTarget');
    const awaySOT = awayComp?.statistics?.find(s => s.name === 'shotsOnTarget');

    // Extract odds
    const odds = extractOddsFromEvent(event);

    return {
      espnEventId: event.id,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      isFinished,
      isLive,
      isScheduled,
      timeElapsed: event.status.displayClock,
      group,
      venue: comp.venue?.fullName || '',
      city: comp.venue?.address?.city || '',
      homeScorers: parseESPNScorers(comp.details, homeComp?.team?.id || ''),
      awayScorers: parseESPNScorers(comp.details, awayComp?.team?.id || ''),
      homePossession: homePoss ? parseFloat(homePoss.displayValue) : null,
      awayPossession: awayPoss ? parseFloat(awayPoss.displayValue) : null,
      homeShotsOnTarget: homeSOT ? parseInt(homeSOT.displayValue) : null,
      awayShotsOnTarget: awaySOT ? parseInt(awaySOT.displayValue) : null,
      odds,
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// QUICK HELPERS
// ═══════════════════════════════════════════════════════════════

/** Fetch today's WC matches, processed and ready to use */
export async function getTodayMatches(): Promise<ProcessedESPNMatch[]> {
  const events = await fetchESPNScoreboard();
  return processESPNScoreboard(events);
}

/** Fetch WC matches for a specific date (YYYYMMDD format) */
export async function getMatchesByDate(date: string): Promise<ProcessedESPNMatch[]> {
  const events = await fetchESPNScoreboard(date);
  return processESPNScoreboard(events);
}

/** Fetch all live matches */
export async function getLiveMatches(): Promise<ProcessedESPNMatch[]> {
  const events = await fetchESPNScoreboard();
  return processESPNScoreboard(events.filter(e => e.status.type.state === 'in'));
}
