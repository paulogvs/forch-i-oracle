// FORCH.i ORACLE — Live Scores API
// Instant real scores without going through full ingest pipeline.
// Source: FIFA Public API (api.fifa.com/api/v3) — gratis, sin API key, datos oficiales en tiempo real
//
// GET /api/live-scores — All matches with scores (finished + live + upcoming)
// GET /api/live-scores?live=true — Only live matches
// GET /api/live-scores?group=A — Matches for a specific group
//
// Server-side cache: 30s TTL (live data needs freshness)

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDataLayerAsync, type IDataLayer } from '@/lib/data-layer';
import { fetchFIFAMatches, toLiveScore, toInternalResult } from '@/lib/fifa-api';
import { mapToSpanish } from '@/lib/teams';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FIFALiveScore {
  id: string;
  matchNumber: number;
  stage: string;
  group: string | null;
  date: string;
  venue: string | null;
  city: string | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  homeTeam: string | null;
  awayTeam: string | null;
  homeCode: string | null;
  awayCode: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenScore: number | null;
  awayPenScore: number | null;
  winner: string | null;
  attendance: number | null;
}

interface LiveScoresResponse {
  success: boolean;
  source: string;
  lastUpdated: string;
  finished: FIFALiveScore[];
  live: FIFALiveScore[];
  upcoming: FIFALiveScore[];
  stats: {
    totalGames: number;
    finishedCount: number;
    liveCount: number;
    upcomingCount: number;
  };
}

// ═══════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════

const liveCache = new Map<string, { data: LiveScoresResponse; expiresAt: number }>();
const LIVE_CACHE_TTL = 30_000; // 30 seconds

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  // Rate limit: 30 req/min per IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 30, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const liveOnly = searchParams.get('live') === 'true';
  const groupFilter = searchParams.get('group');

  // Cache check
  const cacheKey = `scores-${liveOnly}-${groupFilter || 'all'}`;
  const cached = liveCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch from FIFA public API
    const fifaMatches = await fetchFIFAMatches('es');

    if (fifaMatches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'FIFA API unavailable',
      }, { status: 502 });
    }

    // Convert to live score format
    const converted = fifaMatches
      .map(m => toLiveScore(m))
      .filter((v): v is Record<string, unknown> => v !== null)
      .map(v => v as unknown as FIFALiveScore);

    // Filter by group
    const filtered = groupFilter
      ? converted.filter(m => m.group === groupFilter)
      : converted;

    // Sort into buckets
    const finished = filtered.filter(m => m.status === 'finished');
    const live = filtered.filter(m => m.status === 'live');
    const upcoming = filtered.filter(m => m.status === 'scheduled' || m.status === 'postponed');

    // Persist finished matches to data layer (non-blocking)
    if (finished.length > 0) {
      const db = await getDataLayerAsync();
      const existingResults = await db.getMatchResults();
      const existingIds = new Set(existingResults.map(r => r.matchId));

      for (const fm of finished) {
        if (!fm.homeCode || !fm.awayCode || fm.homeScore == null || fm.awayScore == null) continue;
        // Use matchNumber as stable ID for dedup
        const matchId = `FIFA-${fm.matchNumber}`;
        if (existingIds.has(matchId)) continue;

        try {
          await persistFromFIFALiveScore(db, fm);
          existingIds.add(matchId);
        } catch {
          // Non-critical — live-scores serves data regardless
        }
      }
    }

    const response: LiveScoresResponse = {
      success: true,
      source: 'FIFA Public API',
      lastUpdated: new Date().toISOString(),
      finished,
      live,
      upcoming,
      stats: {
        totalGames: filtered.length,
        finishedCount: finished.length,
        liveCount: live.length,
        upcomingCount: upcoming.length,
      },
    };

    // Cache
    liveCache.set(cacheKey, { data: response, expiresAt: Date.now() + LIVE_CACHE_TTL });

    // Live-only response
    if (liveOnly) {
      return NextResponse.json({
        success: true,
        source: 'FIFA Public API',
        lastUpdated: new Date().toISOString(),
        live,
        stats: {
          totalGames: live.length,
          liveCount: live.length,
        },
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[live-scores] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch live scores' },
      { status: 500 }
    );
  }
}

/**
 * Persist a finished match from FIFA live scores to the data layer.
 */
async function persistFromFIFALiveScore(db: IDataLayer, fm: FIFALiveScore): Promise<void> {
  const homeTeam = mapToSpanish(fm.homeCode || '');
  const awayTeam = mapToSpanish(fm.awayCode || '');
  if (!homeTeam || !awayTeam) return;

  let dbMatch = await db.getMatchByTeams(homeTeam, awayTeam);
  if (!dbMatch) dbMatch = await db.getMatchByTeams(awayTeam, homeTeam);
  if (!dbMatch) {
    console.warn(`[live-scores] Match not found: ${homeTeam} vs ${awayTeam}`);
    return;
  }

  const winner = (fm.homeScore ?? 0) > (fm.awayScore ?? 0)
    ? homeTeam
    : (fm.awayScore ?? 0) > (fm.homeScore ?? 0)
      ? awayTeam
      : 'draw';

  await db.submitMatchResult({
    matchId: `FIFA-${fm.matchNumber}`,
    homeScore: fm.homeScore ?? 0,
    awayScore: fm.awayScore ?? 0,
    winner,
  });

  console.log(`[live-scores] Persisted via FIFA: ${homeTeam} ${fm.homeScore}-${fm.awayScore} ${awayTeam}`);
}
