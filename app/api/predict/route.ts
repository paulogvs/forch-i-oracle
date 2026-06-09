// FORCH.i ORACLE — API Route: Predicción de partido
import { NextRequest, NextResponse } from 'next/server';
import { getPrediction } from '@/lib/gemini';
import { getMatchContext } from '@/lib/football-api';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute per IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 10, 60000)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { homeTeam, awayTeam } = body;

    // Validaciones
    if (!homeTeam || !awayTeam) {
      return NextResponse.json(
        { error: 'Se requieren homeTeam y awayTeam' },
        { status: 400 }
      );
    }

    if (homeTeam === awayTeam) {
      return NextResponse.json(
        { error: 'Los equipos deben ser diferentes' },
        { status: 400 }
      );
    }

    // 1. Obtener contexto de datos reales (API-Football + worldcup26.ir)
    const contextData = await getMatchContext(homeTeam, awayTeam);

    // 2. Generar predicción con Gemini 1.5 Flash
    const prediction = await getPrediction(homeTeam, awayTeam, contextData);

    // 3. Retornar resultado
    return NextResponse.json({
      success: true,
      homeTeam,
      awayTeam,
      prediction,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en /api/predict:', error);

    return NextResponse.json(
      { error: 'Error al generar predicción' },
      { status: 500 }
    );
  }
}
