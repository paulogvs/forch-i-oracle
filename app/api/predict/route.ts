// FORCH.i ORACLE — API Route: Match prediction
import { NextRequest, NextResponse } from 'next/server';
import { getPrediction } from '@/lib/gemini';
import { getMatchContext } from '@/lib/football-api';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedPrediction, setCachedPrediction } from '@/lib/cache';

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
      { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
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
        { error: 'Selecciona ambos equipos' },
        { status: 400 }
      );
    }

    if (homeTeam === awayTeam) {
      return NextResponse.json(
        { error: 'Los equipos deben ser diferentes' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getCachedPrediction(homeTeam, awayTeam);
    if (cached) {
      console.log(`[predict] Cache hit for ${homeTeam} vs ${awayTeam}`);
      return NextResponse.json({
        success: true,
        homeTeam,
        awayTeam,
        matchContext,
        prediction: cached,
        fromCache: true,
        timestamp: new Date().toISOString(),
      });
    }

    // 1. Get real data context (API-Football)
    console.log(`[predict] Obteniendo contexto para ${homeTeam} vs ${awayTeam}`);
    let contextData: string;
    try {
      contextData = await getMatchContext(homeTeam, awayTeam);
    } catch (footballError) {
      console.error('[predict] Football API error:', footballError);
      contextData = `No hay datos en vivo disponibles para ${homeTeam} vs ${awayTeam}. Basado en conocimiento general.`;
    }

    // 2. Generate prediction with Groq Llama 3.3
    console.log(`[predict] Llamando a Groq para predicción`);
    const prediction = await getPrediction(
      homeTeam,
      awayTeam,
      contextData,
      matchContext
    );

    // Cache the result
    setCachedPrediction(homeTeam, awayTeam, prediction);

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
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[predict] FALLO:', errorMsg);
    if (errorStack) console.error('[predict] Stack:', errorStack);

    let userMessage = 'Error generando la predicción. Intenta de nuevo en unos segundos.';
    let statusCode = 500;

    if (errorMsg.includes('GEMINI_API_KEY') || errorMsg.includes('API key') || errorMsg.includes('GROQ_API_KEY') || errorMsg.includes('authentication')) {
      userMessage = 'Servicio no disponible temporalmente. Estamos trabajando en ello.';
      statusCode = 503;
    } else if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED')) {
      userMessage = 'Servicio no disponible. Contacta al administrador.';
      statusCode = 503;
    } else if (errorMsg.includes('QUOTA') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('rate limit')) {
      userMessage = 'Demasiadas solicitudes. Intenta de nuevo en un minuto.';
      statusCode = 429;
    } else if (errorMsg.includes('SAFETY') || errorMsg.includes('blocked')) {
      userMessage = 'Predicción bloqueada. Intenta con otros equipos.';
      statusCode = 422;
    } else if (errorMsg.includes('No se pudo analizar') || errorMsg.includes('LLM_PARSE_ERROR')) {
      userMessage = 'Respuesta inválida del servicio. Intenta de nuevo.';
      statusCode = 502;
    } else if (errorMsg.includes('fetch') || errorMsg.includes('ENOTFOUND') || errorMsg.includes('ECONNREFUSED')) {
      userMessage = 'Error de conexión con el servicio. Intenta de nuevo.';
      statusCode = 503;
    }

    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? errorMsg : undefined },
      { status: statusCode }
    );
  }
}
