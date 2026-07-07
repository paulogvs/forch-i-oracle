// FORCH.i ORACLE — Live Scores API
// DISPLAY-ONLY: Reads real results from data layer and resolves team names
// from the tournament bracket. NO external API calls.
//
// GET /api/live-scores — All matches with scores (finished + live + upcoming)
// GET /api/live-scores?live=true — Only live matches
// GET /api/live-scores?group=A — Matches for a specific group

import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getDataLayerAsync } from '@/lib/data-layer';
import { ALL_MATCHES } from '@/lib/matches';
import { getOrComputeTournamentResults } from '@/lib/tournament-results';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface LiveScoreEntry {
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
  finished: LiveScoreEntry[];
  live: LiveScoreEntry[];
  upcoming: LiveScoreEntry[];
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

// Resolved team names for knockout matches (from bracket)
let resolvedKnockoutMap: Map<string, { homeTeam: string; awayTeam: string }> | null = null;

async function buildResolvedMap(): Promise<Map<string, { homeTeam: string; awayTeam: string }>> {
  if (resolvedKnockoutMap) return resolvedKnockoutMap;

  resolvedKnockoutMap = new Map();
  try {
    const tournamentData = await getOrComputeTournamentResults();
    const bracket = tournamentData.bracket;
    if (!bracket) return resolvedKnockoutMap;

    const allBracketMatches = [
      ...(bracket.roundOf32 || []),
      ...(bracket.roundOf16 || []),
      ...(bracket.quarters || []),
      ...(bracket.semis || []),
      bracket.thirdPlace,
      bracket.final,
    ].filter(Boolean);

    for (const bm of allBracketMatches) {
      if (bm.homeTeam && bm.homeTeam !== 'TBD' && bm.awayTeam && bm.awayTeam !== 'TBD') {
        const id = bm.id === 'TP-1' ? '3rd' : bm.id === 'FINAL' ? 'Final' : bm.id;
        resolvedKnockoutMap.set(id, { homeTeam: bm.homeTeam, awayTeam: bm.awayTeam });
      }
    }
  } catch {
    // Non-critical — will fall through to slot names
  }

  return resolvedKnockoutMap;
}

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
    const db = await getDataLayerAsync();
    const storedResults = await db.getMatchResults();
    const resultsMap = new Map(storedResults.map(r => [r.matchId, r]));

    // Build resolved team names for knockout matches from bracket
    const resolvedNames = await buildResolvedMap();

    // Build live score entries from ALL_MATCHES + stored results + resolved names
    const allEntries: LiveScoreEntry[] = ALL_MATCHES.map((match, idx) => {
      const result = resultsMap.get(match.id);
      const hasResult = result && result.homeScore != null;
      const today = new Date();

      // Resolve team names: prefer bracket-resolved names, fall back to ALL_MATCHES
      const resolved = resolvedNames.get(match.id);
      const homeTeam = resolved?.homeTeam || match.homeTeam || null;
      const awayTeam = resolved?.awayTeam || match.awayTeam || null;

      // Winner name from resolved team names
      const winnerName = hasResult && homeTeam && awayTeam
        ? (result!.homeScore > result!.awayScore ? homeTeam :
           result!.awayScore > result!.homeScore ? awayTeam : 'draw')
        : null;

      // Determine status
      let status: LiveScoreEntry['status'] = 'scheduled';
      if (hasResult) {
        status = 'finished';
      } else {
        const matchDate = new Date(match.date + 'T' + (match.time || '12:00'));
        const diffMs = today.getTime() - matchDate.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= 0 && diffHours < 3) status = 'live';
      }

      return {
        id: match.id,
        matchNumber: idx + 1,
        stage: match.round || 'group',
        group: match.round === 'group' ? (match.group || null) : null,
        date: match.date,
        venue: match.venue || null,
        city: match.city || null,
        status,
        homeTeam,
        awayTeam,
        homeCode: null,
        awayCode: null,
        homeScore: result?.homeScore ?? null,
        awayScore: result?.awayScore ?? null,
        homePenScore: null,
        awayPenScore: null,
        winner: winnerName,
        attendance: null,
      };
    });

    // Filter by group
    const filtered = groupFilter
      ? allEntries.filter(m => m.group === groupFilter)
      : allEntries;

    // Sort into buckets
    const finished = filtered.filter(m => m.status === 'finished');
    const live = filtered.filter(m => m.status === 'live');
    const upcoming = filtered.filter(m => m.status === 'scheduled' || m.status === 'postponed');

    const response: LiveScoresResponse = {
      success: true,
      source: 'Forch.i Oracle (hardcoded data + bracket resolution)',
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
        source: 'Forch.i Oracle (hardcoded data + bracket resolution)',
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
