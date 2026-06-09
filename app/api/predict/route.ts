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
    console.log(`[predict] Fetching context for ${homeTeam} vs ${awayTeam}`);
    let contextData: string;
    try {
      contextData = await getMatchContext(homeTeam, awayTeam);
    } catch (footballError) {
      console.error('[predict] Football API error:', footballError);
      // Continue with generic context — Football API is non-critical
      contextData = `No live data available for ${homeTeam} vs ${awayTeam}. Based on general knowledge only.`;
    }

    // 2. Generate prediction with Gemini 1.5 Flash
    console.log(`[predict] Calling Gemini for prediction`);
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
    // Log the ACTUAL error with full details
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[predict] FAILED:', errorMsg);
    if (errorStack) console.error('[predict] Stack:', errorStack);

    // Return specific error messages based on the failure
    let userMessage = 'Error generating prediction';
    let statusCode = 500;

    if (errorMsg.includes('GEMINI_API_KEY')) {
      userMessage = 'Gemini API key not configured. Check .env.local';
      statusCode = 503;
    } else if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('403')) {
      userMessage = 'Invalid Gemini API key. Regenerate at ai.google.dev';
      statusCode = 503;
    } else if (errorMsg.includes('QUOTA') || errorMsg.includes('429')) {
      userMessage = 'Gemini API quota exceeded. Try again later.';
      statusCode = 429;
    } else if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked')) {
      userMessage = 'Prediction blocked by safety filters. Try different teams.';
      statusCode = 422;
    } else if (errorMsg.includes('Could not parse')) {
      userMessage = 'AI returned invalid prediction data. Please retry.';
      statusCode = 502;
    }

    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? errorMsg : undefined },
      { status: statusCode }
    );
  }
}
