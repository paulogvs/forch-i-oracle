// FORCH.i ORACLE — API Route: Match prediction
import { NextRequest, NextResponse } from 'next/server';
import { getPrediction } from '@/lib/gemini';
import { getMatchContext } from '@/lib/football-api';
import { checkRateLimit } from '@/lib/rate-limit';

interface MatchContext {
  id: string;
  group: string;
  matchday: number;
  date: string;
  time: string;
  venue: string;
  city: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';
  if (!checkRateLimit(ip, 10, 60000)) {
    return NextResponse.json(
      { error: 'Too many requests. Try again in a minute.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { homeTeam, awayTeam, matchContext } = body as {
      homeTeam: string;
      awayTeam: string;
      matchContext: MatchContext | null;
    };

    // Validations
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'homeTeam and awayTeam are required' },
        { status: 400 }
      );
    }

    if (homeTeam === awayTeam) {
      return NextResponse.json(
        { error: 'Teams must be different' },
        { status: 400 }
      );
    }

    // 1. Get real data context (API-Football)
    const contextData = await getMatchContext(homeTeam, awayTeam);

    // 2. Generate prediction with Gemini 1.5 Flash
    const prediction = await getPrediction(
      homeTeam,
      awayTeam,
      contextData,
      matchContext
    );

    // 3. Return result
    return NextResponse.json({
      success: true,
      homeTeam,
      awayTeam,
      matchContext,
      prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error in /api/predict:', error);

    return NextResponse.json(
      { error: 'Error generating prediction' },
      { status: 500 }
    );
  }
}
