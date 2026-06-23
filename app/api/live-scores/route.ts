// FORCH.i ORACLE — Live Scores API
// Instant real scores without going through full ingest pipeline.
// Server-side cache: 45s TTL (prevents external API rate-limit exhaustion).
//
// GET /api/live-scores — Returns all finished + live matches with scores
// GET /api/live-scores?live=true — Returns only live matches
// GET /api/live-scores?group=A — Returns matches for a specific group
//
// Data sources: wheniskickoff.com (primary) + openfootball (fallback)

import { NextResponse } from 'next/server';
import { fetchWC26Games, convertWC26Game, type ProcessedWC26Match } from '@/lib/worldcup26-api';
import { checkRateLimit } from '@/lib/rate-limit';

// Server-side cache: 45 seconds (shorter than SWR's 30s to ensure fresh data)
const liveCache = new Map<string, { data: any; expiresAt: number }>();
const LIVE_CACHE_TTL = 45_000;

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

  try {
    const games = await fetchWC26Games();

    if (!games) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch match data',
        source: 'wheniskickoff.com/openfootball',
      }, { status: 503 });
    }

    const finished: ProcessedWC26Match[] = [];
    const live: ProcessedWC26Match[] = [];
    const upcoming: ProcessedWC26Match[] = [];

    for (const game of games) {
      // Apply group filter if specified
      if (groupFilter && game.group !== groupFilter) continue;

      const converted = convertWC26Game(game);
      if (!converted) continue;

      if (converted.isFinished) {
        finished.push(converted);
      } else if (converted.isLive) {
        live.push(converted);
      } else {
        upcoming.push(converted);
      }
    }

    // If live-only, return just live matches
    if (liveOnly) {
      return NextResponse.json({
        success: true,
        source: 'wheniskickoff.com/openfootball',
        lastUpdated: new Date().toISOString(),
        live,
        stats: {
          totalGames: games.length,
          finishedCount: finished.length,
          liveCount: live.length,
          upcomingCount: upcoming.length,
        },
      });
    }

    const response: LiveScoresResponse = {
      success: true,
      source: 'wheniskickoff.com/openfootball',
      lastUpdated: new Date().toISOString(),
      finished,
      live,
      upcoming,
      stats: {
        totalGames: games.length,
        finishedCount: finished.length,
        liveCount: live.length,
        upcomingCount: upcoming.length,
      },
    };

    // Cache the response
    liveCache.set(cacheKey, { data: response, expiresAt: Date.now() + LIVE_CACHE_TTL });

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      error: msg,
      source: 'wheniskickoff.com/openfootball',
    }, { status: 500 });
  }
}
