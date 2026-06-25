// FORCH.i ORACLE — Live Scores API
// Instant real scores without going through full ingest pipeline.
// Server-side cache: 30s TTL (live data needs freshness).
//
// GET /api/live-scores — Returns all finished + live matches with scores
// GET /api/live-scores?live=true — Returns only live matches
// GET /api/live-scores?group=A — Returns matches for a specific group
//
// Data sources:
// 1. football-data.org — Live scores during match hours (IN_PLAY, FINISHED)
// 2. wheniskickoff.com — Static fixtures (upcoming/scheduled)

import { NextResponse } from 'next/server';
import { fetchWC26Games, convertWC26Game, type ProcessedWC26Match } from '@/lib/worldcup26-api';
import { checkRateLimit } from '@/lib/rate-limit';

// Server-side cache: 30 seconds (live data needs freshness)
const liveCache = new Map<string, { data: any; expiresAt: number }>();
const LIVE_CACHE_TTL = 30_000;

// football-data.org config
const FD_BASE_URL = 'https://api.football-data.org/v4';

// Map football-data.org team names to our Spanish names (all 48 WC2026 teams)
// football-data.org uses English names → we map to our Spanish names
const FD_NAME_MAP: Record<string, string> = {
  // Group A
  'Mexico': 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Korea Republic': 'Corea del Sur',
  'Czech Republic': 'Chequia',
  'Czechia': 'Chequia',
  // Group B
  'Canada': 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia & Herzegovina': 'Bosnia y Herzegovina',
  'Qatar': 'Qatar',
  'Switzerland': 'Suiza',
  // Group C
  'Brazil': 'Brasil',
  'Morocco': 'Marruecos',
  'Haiti': 'Haití',
  'Haití': 'Haití',
  'Scotland': 'Escocia',
  // Group D
  'United States': 'Estados Unidos',
  'USA': 'Estados Unidos',
  'Paraguay': 'Paraguay',
  'Australia': 'Australia',
  // Group E
  'Turkey': 'Turquía',
  'Türkiye': 'Turquía',
  'Germany': 'Alemania',
  'Curacao': 'Curazao',
  'Curaçao': 'Curazao',
  // Group F
  'Ivory Coast': 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil',
  'Ecuador': 'Ecuador',
  'Netherlands': 'Países Bajos',
  // Group G
  'Japan': 'Japón',
  'Sweden': 'Suecia',
  'Tunisia': 'Túnez',
  'Belgium': 'Bélgica',
  // Group H
  'Egypt': 'Egipto',
  'Iran': 'Irán',
  'New Zealand': 'Nueva Zelanda',
  // Group I
  'Spain': 'España',
  'Cape Verde': 'Cabo Verde',
  'Cape Verde Islands': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  'Uruguay': 'Uruguay',
  // Group J
  'France': 'Francia',
  'Senegal': 'Senegal',
  'Iraq': 'Irak',
  'Norway': 'Noruega',
  // Group K
  'Argentina': 'Argentina',
  'Algeria': 'Argelia',
  'Austria': 'Austria',
  'Jordan': 'Jordania',
  // Group L
  'Portugal': 'Portugal',
  'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo',
  'Uzbekistan': 'Uzbekistán',
  'Colombia': 'Colombia',
  // Knockout (additional names)
  'England': 'Inglaterra',
  'Croatia': 'Croacia',
  'Ghana': 'Ghana',
  'Panama': 'Panamá',
};

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; tla: string | null };
  awayTeam: { id: number; name: string; tla: string | null };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { homeTeam: number | null; awayTeam: number | null };
    halfTime: { homeTeam: number | null; awayTeam: number | null };
  };
  goals?: Array<{
    minute: number;
    scorer: { name: string; id: number };
    type: string;
    team: { id: number; name: string };
  }>;
}

interface LiveScoresResponse {
  success: boolean;
  source: string;
  lastUpdated: string;
  finished: ProcessedWC26Match[];
  live: ProcessedWC26Match[];
  upcoming: ProcessedWC26Match[];
  stats: {
    totalGames: number;
    finishedCount: number;
    liveCount: number;
    upcomingCount: number;
  };
  debug?: {
    fdError?: string;
    fdTokenSet: boolean;
    fdMatchCount: number;
  };
}

function mapFDTeamName(fdName: string): string | null {
  return FD_NAME_MAP[fdName] || null;
}

function mapFDStatus(status: string): 'live' | 'finished' | 'upcoming' {
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'live';
  if (status === 'FINISHED') return 'finished';
  return 'upcoming';
}

export async function GET(request: Request) {
  // Rate limit: 30 req/min per IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const liveOnly = searchParams.get('live') === 'true';
  const groupFilter = searchParams.get('group');

  // Server-side cache check
  const cacheKey = `scores-${liveOnly}-${groupFilter || 'all'}`;
  const cached = liveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  // Try football-data.org first for live scores (requires token — WC is TIER_ONE)
  let fdMatches: FDMatch[] | null = null;
  let fdError: string | null = null;
  try {
    const headers: Record<string, string> = {};
    const fdToken = process.env.FOOTBALL_DATA_ORG_TOKEN;
    if (fdToken) {
      headers['X-Auth-Token'] = fdToken;
    } else {
      fdError = 'No FOOTBALL_DATA_ORG_TOKEN set — football-data.org requires auth for WC (TIER_ONE)';
      console.warn(`[live-scores] ${fdError}`);
    }

    if (fdToken) {
      // Fetch IN_PLAY + FINISHED matches for real-time data
      const response = await fetch(
        `${FD_BASE_URL}/competitions/WC/matches?status=IN_PLAY,FINISHED`,
        {
          headers,
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.ok) {
        const data = await response.json();
        fdMatches = data.matches || [];
      } else {
        fdError = `football-data.org HTTP ${response.status}`;
        console.warn(`[live-scores] ${fdError}`);
      }
    }
  } catch (err) {
    fdError = `football-data.org fetch failed: ${err}`;
    console.warn(`[live-scores] ${fdError}`);
  }

  const finished: ProcessedWC26Match[] = [];
  const live: ProcessedWC26Match[] = [];
  const upcoming: ProcessedWC26Match[] = [];

  // Process football-data.org matches if available
  if (fdMatches && fdMatches.length > 0) {
    for (const fd of fdMatches) {
      const status = mapFDStatus(fd.status);
      if (status !== 'live' && status !== 'finished') continue;

      const homeTeam = mapFDTeamName(fd.homeTeam.name);
      const awayTeam = mapFDTeamName(fd.awayTeam.name);
      if (!homeTeam || !awayTeam) continue;

      const homeGoals = fd.score.fullTime.homeTeam;
      const awayGoals = fd.score.fullTime.awayTeam;
      if (homeGoals === null || awayGoals === null) continue;

      const match: ProcessedWC26Match = {
        homeTeam,
        awayTeam,
        homeScore: homeGoals,
        awayScore: awayGoals,
        isFinished: fd.status === 'FINISHED',
        isLive: fd.status === 'IN_PLAY' || fd.status === 'PAUSED',
        timeElapsed: fd.status === 'IN_PLAY' ? 'En juego' : '',
        group: fd.group || '',
        matchday: fd.matchday || 0,
        round: fd.stage || '',
        homeScorers: (fd.goals || []).filter(g => g.team.id === fd.homeTeam.id).map(g => g.scorer.name),
        awayScorers: (fd.goals || []).filter(g => g.team.id === fd.awayTeam.id).map(g => g.scorer.name),
        stadium: '',
        winner: fd.score.winner === 'HOME_TEAM' ? homeTeam : fd.score.winner === 'AWAY_TEAM' ? awayTeam : 'draw',
      };

      if (match.isFinished) {
        finished.push(match);
      } else if (match.isLive) {
        live.push(match);
      }
    }
  }

  // Fallback: use wheniskickoff.com for upcoming matches (and any live/finished not caught by FD)
  try {
    const games = await fetchWC26Games();
    if (games) {
      for (const game of games) {
        if (groupFilter && game.group !== groupFilter) continue;
        const converted = convertWC26Game(game);
        if (!converted) continue;

        // Skip if already captured from football-data.org
        const alreadyHave = [...finished, ...live].some(
          m => m.homeTeam === converted.homeTeam && m.awayTeam === converted.awayTeam
        );
        if (alreadyHave) continue;

        if (converted.isFinished) {
          finished.push(converted);
        } else if (converted.isLive) {
          live.push(converted);
        } else {
          upcoming.push(converted);
        }
      }
    }
  } catch {
    // wheniskickoff unavailable — that's fine, we have FD data
  }

  // If live-only, return just live matches
  if (liveOnly) {
    return NextResponse.json({
      success: true,
      source: fdMatches && fdMatches.length > 0 ? 'football-data.org' : 'wheniskickoff.com',
      lastUpdated: new Date().toISOString(),
      live,
      stats: {
        totalGames: finished.length + live.length + upcoming.length,
        finishedCount: finished.length,
        liveCount: live.length,
        upcomingCount: upcoming.length,
      },
    });
  }

  const response: LiveScoresResponse = {
    success: true,
    source: fdMatches && fdMatches.length > 0 ? 'football-data.org + wheniskickoff.com' : 'wheniskickoff.com',
    lastUpdated: new Date().toISOString(),
    finished,
    live,
    upcoming,
    stats: {
      totalGames: finished.length + live.length + upcoming.length,
      finishedCount: finished.length,
      liveCount: live.length,
      upcomingCount: upcoming.length,
    },
    debug: {
      fdError: fdError || undefined,
      fdTokenSet: !!process.env.FOOTBALL_DATA_ORG_TOKEN,
      fdMatchCount: fdMatches?.length || 0,
    },
  };

  // Cache the response
  liveCache.set(cacheKey, { data: response, expiresAt: Date.now() + LIVE_CACHE_TTL });

  return NextResponse.json(response);
}
