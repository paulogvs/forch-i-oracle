// FORCH.i ORACLE — FIFA Public API Client
// Fuente oficial de datos para el Mundial 2026.
// API pública: NO requiere API key, NO requiere autenticación.
// Endpoint base: https://api.fifa.com/api/v3
//
// Inspirado en 26worldcup/26worldcup.github.io (scripts/update.mjs)
// Reemplaza: worldcup26-api.ts, espn-api.ts, API-Football, football-data.org
//
// Uso:
//   import { fetchFIFAMatches, type FIFAMatch } from '@/lib/fifa-api';
//   const matches = await fetchFIFAMatches('es');

import { mapToSpanish, mapToEnglish } from './teams';

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const FIFA_BASE = 'https://api.fifa.com/api/v3';
const ID_COMPETITION = '17';       // FIFA World Cup
const ID_SEASON = '285023';        // 2026 Edition

const STAGE_MAP: Record<number, string> = {
  289273: 'group',
  289287: 'r32',
  289288: 'r16',
  289289: 'qf',
  289290: 'sf',
  289291: 'third',
  289292: 'final',
};

const USER_AGENT = 'forchi-oracle/1.0';

// ═══════════════════════════════════════════════════════════════
// TIPOS — Formato FIFA API v3 normalizado
// ═══════════════════════════════════════════════════════════════

export interface FIFAMatchTeam {
  code: string | null;         // FIFA country code (e.g. "MEX")
  name: string | null;         // Localized name
  score: number | null;
  penScore: number | null;     // Penalty shootout score (only if shootout)
}

export interface FIFAMatch {
  id: string;                  // FIFA match ID (IdMatch)
  matchNumber: number;
  stage: string;               // 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final'
  group: string | null;        // 'A'-'L' or null for knockout
  date: string;                // ISO date string
  venue: string | null;        // Stadium name
  city: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  home: FIFAMatchTeam | null;  // null if placeholder (TBD)
  away: FIFAMatchTeam | null;
  winner: string | null;       // Country code of winner, null if draw
  attendance: number | null;
}

export interface FIFAMatchRaw {
  IdMatch: string;
  MatchNumber: number;
  IdStage: number;
  IdGroup?: string;
  GroupName?: { Description?: string };
  Date: string;
  MatchTime?: string;
  MatchStatus: number;
  Home?: {
    IdCountry?: string;
    TeamName?: { Description?: string };
    Score?: number;
    TeamPenaltyScore?: number;
  };
  Away?: {
    IdCountry?: string;
    TeamName?: { Description?: string };
    Score?: number;
    TeamPenaltyScore?: number;
  };
  Winner?: string;
  Stadium?: {
    IdStadium?: string;
    Name?: { Description?: string };
    CityName?: { Description?: string };
  };
  Attendance?: number;
  PlaceHolderA?: string;
  PlaceHolderB?: string;
  ResultType?: number;
  HomeTeamPenaltyScore?: number;
  AwayTeamPenaltyScore?: number;
}

// ═══════════════════════════════════════════════════════════════
// FETCH CON RETRY
// ═══════════════════════════════════════════════════════════════

async function fetchJSON(url: string, retries = 3): Promise<unknown> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        // 4xx no se retry (excepto 429)
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(`FIFA API HTTP ${res.status}`);
        }
        throw new Error(`FIFA API HTTP ${res.status}`);
      }
      const text = await res.text();
      if (!text || text.startsWith('<')) throw new Error('non-JSON response');
      return JSON.parse(text);
    } catch (err) {
      if (i === retries - 1) throw err;
      // Esperar antes de retry (backoff simple)
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// FETCH MATCHES
// ═══════════════════════════════════════════════════════════════

/**
 * Obtener TODOS los partidos del Mundial 2026 desde la API pública de FIFA.
 *
 * @param lang - Código de idioma ('es', 'en', etc.)
 * @returns Array de partidos normalizados
 */
export async function fetchFIFAMatches(lang = 'es'): Promise<FIFAMatch[]> {
  const url = `${FIFA_BASE}/calendar/matches?idCompetition=${ID_COMPETITION}&idSeason=${ID_SEASON}&count=500&language=${lang}`;

  const data = await fetchJSON(url) as { Results?: FIFAMatchRaw[] } | null;
  if (!data?.Results) {
    console.error('[fifa-api] No matches data from FIFA API');
    return [];
  }

  const raw = data.Results;

  // Validar: siempre deben ser 104 partidos
  if (raw.length !== 104) {
    console.warn(`[fifa-api] Expected 104 matches, got ${raw.length}. Using partial data.`);
  }

  return raw.map(normalizeMatch).filter(Boolean) as FIFAMatch[];
}

/**
 * Obtener SOLO partidos finalizados (status = finished)
 */
export async function fetchFinishedMatches(lang = 'es'): Promise<FIFAMatch[]> {
  const all = await fetchFIFAMatches(lang);
  return all.filter(m => m.status === 'finished');
}

/**
 * Obtener SOLO partidos en vivo
 */
export async function fetchLiveMatches(lang = 'es'): Promise<FIFAMatch[]> {
  const all = await fetchFIFAMatches(lang);
  return all.filter(m => m.status === 'live');
}

// ═══════════════════════════════════════════════════════════════
// NORMALIZACIÓN
// ═══════════════════════════════════════════════════════════════

const txt = (obj: { Description?: string } | undefined | null): string | null =>
  obj?.Description ?? null;

function statusOf(rawStatus: number, match: FIFAMatchRaw): FIFAMatch['status'] {
  switch (rawStatus) {
    case 0: return 'finished';
    case 3: return 'live';
    case 4:
    case 7: return 'postponed';
    default:
      // Si tiene score o tiempo, probablemente está en vivo
      if (match.MatchTime || match.Home?.Score != null) return 'live';
      return 'scheduled';
  }
}

function normalizeMatch(raw: FIFAMatchRaw): FIFAMatch | null {
  try {
    const stage = STAGE_MAP[raw.IdStage] || 'group';

    // Home/Away con placeholders TBD (equipos aún no definidos)
    const home: FIFAMatchTeam | null = raw.Home?.IdCountry
      ? {
          code: raw.Home.IdCountry,
          name: txt(raw.Home.TeamName),
          score: raw.Home.Score ?? null,
          penScore: raw.HomeTeamPenaltyScore ?? null,
        }
      : null;

    const away: FIFAMatchTeam | null = raw.Away?.IdCountry
      ? {
          code: raw.Away.IdCountry,
          name: txt(raw.Away.TeamName),
          score: raw.Away.Score ?? null,
          penScore: raw.AwayTeamPenaltyScore ?? null,
        }
      : null;

    // Determinar ganador
    let winner: string | null = null;
    if (raw.Winner && raw.Winner !== '0') {
      winner = raw.Winner === raw.Home?.IdCountry
        ? (raw.Home?.IdCountry ?? null)
        : raw.Winner === raw.Away?.IdCountry
          ? (raw.Away?.IdCountry ?? null)
          : null;
    }

    return {
      id: raw.IdMatch,
      matchNumber: raw.MatchNumber || 0,
      stage,
      group: raw.IdGroup ? (txt(raw.GroupName) || '').replace('Group ', '') || null : null,
      date: raw.Date,
      venue: txt(raw.Stadium?.Name) || null,
      city: txt(raw.Stadium?.CityName) || null,
      status: statusOf(raw.MatchStatus, raw),
      home,
      away,
      winner,
      attendance: raw.Attendance ?? null,
    };
  } catch (err) {
    console.error(`[fifa-api] Error normalizing match ${raw.IdMatch}:`, err);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPERS DE CONVERSIÓN A FORMATO INTERNO
// ═══════════════════════════════════════════════════════════════

export interface InternalMatchResult {
  matchId: string;
  homeTeam: string;         // Nombre español
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  homePenScore?: number;
  awayPenScore?: number;
  winner: string | 'draw';
  stage: string;
  group: string | null;
  matchNumber: number;
}

/**
 * Convertir FIFAMatch a InternalMatchResult (usado por ingest pipeline).
 * El mapping de nombres usa mapToSpanish() — la FUENTE ÚNICA DE VERDAD.
 */
export function toInternalResult(match: FIFAMatch): InternalMatchResult | null {
  if (match.status !== 'finished') return null;
  if (!match.home?.code || !match.away?.code) return null;
  if (match.home.score == null || match.away.score == null) return null;

  const homeTeam = mapToSpanish(match.home.code);
  const awayTeam = mapToSpanish(match.away.code);

  if (!homeTeam || !awayTeam) {
    console.warn(`[fifa-api] Unmapped teams: ${match.home.code} / ${match.away.code}`);
    return null;
  }

  // Si hay penalty shootout, el winner puede ser distinto del score FT
  let winner: string | 'draw' = 'draw';
  if (match.winner) {
    winner = match.winner === match.home.code ? homeTeam : awayTeam;
  } else if (match.home.score !== match.away.score) {
    winner = match.home.score > match.away.score ? homeTeam : awayTeam;
  }

  return {
    matchId: match.id,
    homeTeam,
    awayTeam,
    homeScore: match.home.score,
    awayScore: match.away.score,
    ...(match.home.penScore != null ? { homePenScore: match.home.penScore } : {}),
    ...(match.away.penScore != null ? { awayPenScore: match.away.penScore } : {}),
    winner,
    stage: match.stage,
    group: match.group,
    matchNumber: match.matchNumber,
  };
}

/**
 * Convertir FIFAMatch a formato plano para live-scores
 */
export function toLiveScore(match: FIFAMatch): Record<string, unknown> | null {
  const homeSpanish = match.home?.code ? mapToSpanish(match.home.code) : null;
  const awaySpanish = match.away?.code ? mapToSpanish(match.away.code) : null;

  return {
    id: match.id,
    matchNumber: match.matchNumber,
    stage: match.stage,
    group: match.group,
    date: match.date,
    venue: match.venue,
    city: match.city,
    status: match.status,
    homeTeam: homeSpanish || match.home?.code || null,
    awayTeam: awaySpanish || match.away?.code || null,
    homeCode: match.home?.code || null,
    awayCode: match.away?.code || null,
    homeScore: match.home?.score ?? null,
    awayScore: match.away?.score ?? null,
    homePenScore: match.home?.penScore ?? null,
    awayPenScore: match.away?.penScore ?? null,
    winner: match.winner,
    attendance: match.attendance,
  };
}
