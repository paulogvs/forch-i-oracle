// FORCH.i ORACLE — Live Scores API (Direct from worldcup26.ir)
// Instant real scores without going through full ingest pipeline
// Used by live page for immediate display
//
// GET /api/live-scores — Returns all finished + live matches with scores
// GET /api/live-scores?live=true — Returns only live matches
// GET /api/live-scores?group=A — Returns matches for a specific group

import { NextResponse } from 'next/server';
import { fetchWC26Games, convertWC26Game, teamIdToSpanish, type WC26Game, type ProcessedWC26Match } from '@/lib/worldcup26-api';

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
  const { searchParams } = new URL(request.url);
  const liveOnly = searchParams.get('live') === 'true';
  const groupFilter = searchParams.get('group');

  try {
    const games = await fetchWC26Games();

    if (!games) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch from worldcup26.ir',
        source: 'worldcup26.ir',
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
        source: 'worldcup26.ir',
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
      source: 'worldcup26.ir',
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

    return NextResponse.json(response);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      error: msg,
      source: 'worldcup26.ir',
    }, { status: 500 });
  }
}
