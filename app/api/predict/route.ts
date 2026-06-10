// FORCH.i ORACLE — API Route: Match prediction
import { NextRequest, NextResponse } from 'next/server';
import { getPrediction } from '@/lib/groq';
import { getMatchContext } from '@/lib/football-api';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedPrediction, setCachedPrediction } from '@/lib/cache';
import { calculateStatisticalPrediction, getKeyFactors, type RealTeamStats } from '@/lib/predictor-engine';
import { getComprehensiveTeamStats } from '@/lib/football-api';
import type { Prediction } from '@/lib/groq';

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

    // 1. Calculate STATISTICAL prediction INSTANTLY (Poisson + Elo + xG) — 0ms
    console.log(`[predict] Calculando predicción estadística para ${homeTeam} vs ${awayTeam}`);

    // 1b. Try to get REAL stats from API-Football (timeout 5s, non-blocking)
    let homeRealStats: RealTeamStats | undefined;
    let awayRealStats: RealTeamStats | undefined;

    try {
      const [homeStats, awayStats] = await Promise.all([
        getComprehensiveTeamStats(homeTeam),
        getComprehensiveTeamStats(awayTeam),
      ]);
      if (homeStats) {
        homeRealStats = homeStats;
        console.log(`[predict] Real stats for ${homeTeam}: attack=${homeStats.attackStrength.toFixed(1)}, defense=${homeStats.defenseStrength.toFixed(1)}`);
      }
      if (awayStats) {
        awayRealStats = awayStats;
        console.log(`[predict] Real stats for ${awayTeam}: attack=${awayStats.attackStrength.toFixed(1)}, defense=${awayStats.defenseStrength.toFixed(1)}`);
      }
    } catch (err) {
      console.warn('[predict] Could not fetch real stats, using Elo fallback:', err);
    }

    const stats = await calculateStatisticalPrediction(
      homeTeam, awayTeam,
      undefined, undefined, // form (will come from API-Football below)
      undefined, undefined, // injuries (will come from API-Football below)
      homeRealStats, awayRealStats
    );

    // 2. Get real data context for Groq analysis (API-Football) — 5s timeout each
    console.log(`[predict] Obteniendo contexto de API-Football (timeout 5s)`);
    let contextData: string;
    let homeForm: ('W' | 'D' | 'L')[] | undefined;
    let awayForm: ('W' | 'D' | 'L')[] | undefined;
    let homeInjuries: string[] | undefined;
    let awayInjuries: string[] | undefined;

    try {
      contextData = await getMatchContext(homeTeam, awayTeam);
      // Extract form and injuries from context for re-recalculating key factors
      const contextMatch = contextData.match(/Forma reciente:\s*([WDL]*)/g);
      if (contextMatch) {
        homeForm = (contextMatch[0]?.match(/[WDL]/g) || []) as ('W' | 'D' | 'L')[];
        awayForm = (contextMatch[1]?.match(/[WDL]/g) || []) as ('W' | 'D' | 'L')[];
      }
      const injuryMatch = contextData.match(/Lesiones conocidas:\s*(.+)/g);
      if (injuryMatch) {
        homeInjuries = injuryMatch[0]?.split(': ')[1]?.split(', ') || [];
        awayInjuries = injuryMatch[1]?.split(': ')[1]?.split(', ') || [];
      }
    } catch (footballError) {
      console.error('[predict] Football API error:', footballError);
      contextData = `No hay datos en vivo disponibles para ${homeTeam} vs ${awayTeam}. Basado en conocimiento general.`;
    }

    // 3. Calculate key factors based on statistical data
    const keyFactors = getKeyFactors(stats, homeTeam, awayTeam, homeForm, awayForm, homeInjuries, awayInjuries);

    // 4. Call Groq ONLY for the textual analysis (numbers are already calculated)
    //    Timeout: 8s max. If it fails, we still have the stats.
    console.log(`[predict] Llamando a Groq para análisis narrativo (timeout 8s)`);
    let groqAnalysis: { analysis: string; homeKeyPlayers: string[]; awayKeyPlayers: string[] } | null = null;

    try {
      const groqPrediction = await getPrediction(
        homeTeam,
        awayTeam,
        contextData,
        matchContext,
        stats  // Pass calculated stats so Groq can write informed analysis
      );
      groqAnalysis = {
        analysis: groqPrediction.analysis,
        homeKeyPlayers: groqPrediction.homeKeyPlayers,
        awayKeyPlayers: groqPrediction.awayKeyPlayers,
      };
    } catch (groqError) {
      const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);
      console.warn(`[predict] Groq fallback: ${groqMsg}`);
      // Fallback: use stats-based analysis
      groqAnalysis = {
        analysis: `Análisis estadístico: ${homeTeam} tiene ${stats.homeWin}% de probabilidad de victoria con un marcador más probable de ${stats.predictedScoreHome}-${stats.predictedScoreAway}. Goles esperados: ${homeTeam} ${stats.homeExpectedGoals} xG vs ${awayTeam} ${stats.awayExpectedGoals} xG. Confianza del modelo: ${stats.confidence}.`,
        homeKeyPlayers: [],
        awayKeyPlayers: [],
      };
    }

    // 5. MERGE: statistical numbers + Groq text analysis (or fallback)
    const prediction: Prediction = {
      homeWin: stats.homeWin,
      draw: stats.draw,
      awayWin: stats.awayWin,
      predictedScoreHome: stats.predictedScoreHome,
      predictedScoreAway: stats.predictedScoreAway,
      confidence: stats.confidence,
      analysis: groqAnalysis?.analysis || `Predicción estadística: ${homeTeam} ${stats.homeWin}% | Empate ${stats.draw}% | ${awayTeam} ${stats.awayWin}%`,
      keyFactors,                          // Calculated from stats
      homeKeyPlayers: groqAnalysis?.homeKeyPlayers || [],
      awayKeyPlayers: groqAnalysis?.awayKeyPlayers || [],
      homeFormLast5: homeForm || ['D', 'D', 'D', 'D', 'D'],
      awayFormLast5: awayForm || ['D', 'D', 'D', 'D', 'D'],
      homeAttackStrength: stats.homeAttack,
      awayAttackStrength: stats.awayAttack,
      homeDefenseStrength: stats.homeDefense,
      awayDefenseStrength: stats.awayDefense,
      homeMidfieldStrength: stats.homeMidfield,
      awayMidfieldStrength: stats.awayMidfield,
    };

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

    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('GROQ_API_KEY') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
      userMessage = 'Servicio no disponible temporalmente. Estamos trabajando en ello.';
      statusCode = 503;
    } else if (errorMsg.includes('403') || errorMsg.includes('PERMISSION_DENIED')) {
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
