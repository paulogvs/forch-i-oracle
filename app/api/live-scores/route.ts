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
import { fetchWC26Games, convertWC26Game, type ProcessedWC26Match, type WC26Game } from '@/lib/worldcup26-api';
import { checkRateLimit } from '@/lib/rate-limit';
import { mapFDNameToSpanish } from '@/lib/teams';
import { getDataLayerAsync } from '@/lib/data-layer';

// Server-side cache: 30 seconds (live data needs freshness)
const liveCache = new Map<string, { data: any; expiresAt: number }>();
const LIVE_CACHE_TTL = 30_000;

// football-data.org config
const FD_BASE_URL = 'https://api.football-data.org/v4';

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
  return mapFDNameToSpanish(fdName);
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
    const fdToken = process.env.FOOTBALL_DATA_ORG_TOKEN || process.env.FOOTBALL_API_KEY;
    if (fdToken) {
      headers['X-Auth-Token'] = fdToken;
    } else {
      fdError = 'No FOOTBALL_DATA_ORG_TOKEN or FOOTBALL_API_KEY set — football-data.org requires auth for WC (TIER_ONE)';
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
      // Use == null to catch both null AND undefined (football-data.org returns undefined for missing scores)
      if (homeGoals == null || awayGoals == null) continue;

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
        // Persist to data layer immediately (feeds accuracy pipeline)
        persistFinishedMatch(match).catch(e =>
          console.warn('[live-scores] persist error:', e)
        );
      } else if (match.isLive) {
        live.push(match);
      }
    }
  }

  // Fetch wheniskickoff.com data once (used for both fallback and merge)
  let wkiGames: WC26Game[] | null = null;
  try {
    wkiGames = await fetchWC26Games();
  } catch {
    // wheniskickoff unavailable — that's fine, we have FD data
  }

  // Fallback: use wheniskickoff.com for upcoming matches (and any live/finished not caught by FD)
  if (wkiGames) {
    for (const game of wkiGames) {
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

  // MERGE: Fill any finished entries missing scores from wheniskickoff data
  // This handles edge cases where football-data.org returned matches with
  // undefined scores that slipped through the null check
  if (wkiGames) {
    for (const game of wkiGames) {
      const converted = convertWC26Game(game);
      if (!converted || !converted.isFinished) continue;

      const match = finished.find(
        m => m.homeTeam === converted.homeTeam && m.awayTeam === converted.awayTeam
      );
      if (match) {
        // Fill in missing scores
        if (match.homeScore == null || match.awayScore == null) {
          match.homeScore = converted.homeScore;
          match.awayScore = converted.awayScore;
          match.winner = converted.winner;
          match.timeElapsed = 'finished';
        }
        // Also fill empty scorers
        if (match.homeScorers.length === 0 && converted.homeScorers.length > 0) {
          match.homeScorers = converted.homeScorers;
        }
        if (match.awayScorers.length === 0 && converted.awayScorers.length > 0) {
          match.awayScorers = converted.awayScorers;
        }
      }
    }
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
      fdTokenSet: !!(process.env.FOOTBALL_DATA_ORG_TOKEN || process.env.FOOTBALL_API_KEY),
      fdMatchCount: fdMatches?.length || 0,
    },
  };

  // Cache the response
  liveCache.set(cacheKey, { data: response, expiresAt: Date.now() + LIVE_CACHE_TTL });

  return NextResponse.json(response);
}

/**
 * Persist a finished match from football-data.org to the data layer.
 * This bridges the live-scores feed into the accuracy pipeline so that
 * the fixture endpoint and accuracy engine see results without waiting
 * for the fixture route's poll cycle.
 */
async function persistFinishedMatch(match: ProcessedWC26Match): Promise<void> {
  try {
    const db = await getDataLayerAsync();
    // Use getMatchByTeams which resolves team names to IDs correctly
    let dbMatch = await db.getMatchByTeams(match.homeTeam, match.awayTeam);
    if (!dbMatch) dbMatch = await db.getMatchByTeams(match.awayTeam, match.homeTeam);
    if (!dbMatch) {
      console.warn(`[live-scores] Match not found: ${match.homeTeam} vs ${match.awayTeam} — can't persist`);
      return;
    }

    // Check if already persisted
    const existing = await db.getMatchResults();
    if (existing.some(r => r.matchId === dbMatch.id)) return; // Already have it

    const winner = match.homeScore > match.awayScore
      ? match.homeTeam
      : match.awayScore > match.homeScore
        ? match.awayTeam
        : 'draw';

    await db.submitMatchResult({
      matchId: dbMatch.id,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      winner,
    });
    console.log(`[live-scores] Persisted result: ${match.homeTeam} ${match.homeScore}-${match.awayScore} ${match.awayTeam}`);
  } catch (err) {
    console.warn(`[live-scores] Failed to persist ${match.homeTeam} vs ${match.awayTeam}:`, err);
  }
}
