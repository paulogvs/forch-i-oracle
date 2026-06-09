// FORCH.i ORACLE — API Route: Simulate entire tournament
import { NextRequest, NextResponse } from 'next/server';
import { simulateTournament } from '@/lib/tournament-sim';
import { getCachedPrediction, setCachedPrediction } from '@/lib/cache';

// Cache the entire tournament simulation for 2 hours
interface TournamentCacheData {
  bracket: unknown;
}

const tournamentCache = new Map<string, { data: TournamentCacheData; expiresAt: number }>();
const TOURNAMENT_CACHE_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(request: NextRequest) {
  // Check cache
  const cacheKey = 'tournament-simulation';
  const cached = tournamentCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    console.log('[tournament] Cache hit');
    return NextResponse.json({
      success: true,
      bracket: cached.data.bracket,
      fromCache: true,
    });
  }

  try {
    console.log('[tournament] Starting full tournament simulation...');
    const bracket = await simulateTournament();

    const result = {
      bracket,
    };

    // Cache the result
    tournamentCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + TOURNAMENT_CACHE_MS,
    });

    return NextResponse.json({
      success: true,
      bracket,
      fromCache: false,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[tournament] Simulation failed:', errorMsg);

    return NextResponse.json(
      {
        error: 'Error simulando el torneo. Intenta de nuevo.',
        details: process.env.NODE_ENV === 'development' ? errorMsg : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  tournamentCache.clear();
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
