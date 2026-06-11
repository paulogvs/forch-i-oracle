// FORCH.i ORACLE — API Route: Match prediction (v2 with Data Layer)
// Updated to use the data layer for caching predictions and the enhanced engine.

import { NextRequest, NextResponse } from 'next/server';
import { getPrediction } from '@/lib/groq';
import { getMatchContext, getComprehensiveTeamStats } from '@/lib/football-api';
import { checkRateLimit } from '@/lib/rate-limit';
import { getCachedPrediction, setCachedPrediction } from '@/lib/cache';
import {
  calculateStatisticalPrediction,
  getKeyFactors,
  type RealTeamStats,
} from '@/lib/predictor-engine';
import { calculateEnhancedPrediction, type EnhancedPredictionContext } from '@/lib/enhanced-engine';
import { getDataLayer } from '@/lib/data-layer';
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

    const db = getDataLayer();

    // Check data layer cache first (Supabase or in-memory)
    const matchInDb = await db.getMatchByTeams(homeTeam, awayTeam);
    if (matchInDb) {
      const cachedPred = await db.getPrediction(matchInDb.id);
      if (cachedPred) {
        console.log(`[predict:v2] DB cache hit for ${homeTeam} vs ${awayTeam}`);
        return NextResponse.json({
          success: true,
          homeTeam,
          awayTeam,
          matchContext,
          prediction: {
            homeWin: cachedPred.homeWin,
            draw: cachedPred.draw,
            awayWin: cachedPred.awayWin,
            predictedScoreHome: parseInt(cachedPred.mostLikelyScore.split('-')[0]),
            predictedScoreAway: parseInt(cachedPred.mostLikelyScore.split('-')[1]),
            confidence: cachedPred.confidence,
            analysis: cachedPred.analysis || 'Análisis no disponible.',
            keyFactors: cachedPred.keyFactors || [],
            homeKeyPlayers: cachedPred.homeKeyPlayers || [],
            awayKeyPlayers: cachedPred.awayKeyPlayers || [],
            homeFormLast5: ['D', 'D', 'D', 'D', 'D'],
            awayFormLast5: ['D', 'D', 'D', 'D', 'D'],
            homeAttackStrength: cachedPred.homeAttack ?? 50,
            awayAttackStrength: cachedPred.awayAttack ?? 50,
            homeDefenseStrength: cachedPred.homeDefense ?? 50,
            awayDefenseStrength: cachedPred.awayDefense ?? 50,
            homeMidfieldStrength: cachedPred.homeMidfield ?? 50,
            awayMidfieldStrength: cachedPred.awayMidfield ?? 50,
          },
          fromCache: true,
          fromDb: true,
          timestamp: cachedPred.predictedAt,
          dataQuality: cachedPred.dataQualityScore,
        });
      }
    }

    // Check in-memory cache
    const cached = getCachedPrediction(homeTeam, awayTeam);
    if (cached) {
      console.log(`[predict:v2] Memory cache hit for ${homeTeam} vs ${awayTeam}`);
      return NextResponse.json({
        success: true,
        homeTeam,
        awayTeam,
        matchContext,
        prediction: cached,
        fromCache: true,
        fromDb: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Build enhanced context
    const homeForm = await db.getTeamForm(homeTeam);
    const awayForm = await db.getTeamForm(awayTeam);

    const homeContext: EnhancedPredictionContext = {
      teamName: homeTeam,
      venue: matchContext?.venue,
      recentMatches: homeForm?.last5?.map(f => ({
        opponent: f.opponent,
        goalsFor: f.goalsFor,
        goalsAgainst: f.goalsAgainst,
        result: f.result,
        date: f.date,
      })),
      daysSinceLastMatch: homeForm?.updatedAt
        ? Math.floor((Date.now() - new Date(homeForm.updatedAt).getTime()) / 86400000)
        : undefined,
    };

    const awayContext: EnhancedPredictionContext = {
      teamName: awayTeam,
      venue: matchContext?.venue,
      recentMatches: awayForm?.last5?.map(f => ({
        opponent: f.opponent,
        goalsFor: f.goalsFor,
        goalsAgainst: f.goalsAgainst,
        result: f.result,
        date: f.date,
      })),
      daysSinceLastMatch: awayForm?.updatedAt
        ? Math.floor((Date.now() - new Date(awayForm.updatedAt).getTime()) / 86400000)
        : undefined,
    };

    // Calculate enhanced prediction
    console.log(`[predict:v2] Calculating enhanced prediction for ${homeTeam} vs ${awayTeam}`);

    // Also get real stats from API-Football (non-blocking)
    let homeRealStats: RealTeamStats | undefined;
    let awayRealStats: RealTeamStats | undefined;

    try {
      const [homeStats, awayStats] = await Promise.all([
        getComprehensiveTeamStats(homeTeam),
        getComprehensiveTeamStats(awayTeam),
      ]);
      homeRealStats = homeStats || undefined;
      awayRealStats = awayStats || undefined;
    } catch {
      // Ignore, use Elo fallback
    }

    // Base statistical prediction
    const baseStats = await calculateStatisticalPrediction(
      homeTeam, awayTeam,
      homeForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined,
      awayForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined,
      undefined, undefined,
      homeRealStats, awayRealStats
    );

    // Get API-Football context for Groq
    let contextData: string;
    let homeInjuriesArr: string[] | undefined;
    let awayInjuriesArr: string[] | undefined;

    try {
      contextData = await getMatchContext(homeTeam, awayTeam);
    } catch {
      contextData = `No hay datos en vivo disponibles para ${homeTeam} vs ${awayTeam}. Basado en conocimiento general.`;
    }

    // Enhanced prediction (uses base stats + adjustments)
    const enhanced = await calculateEnhancedPrediction(
      homeTeam, awayTeam,
      homeContext, awayContext
    );

    // Key factors
    const keyFactors = getKeyFactors(
      enhanced,
      homeTeam, awayTeam,
      homeForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined,
      awayForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined
    );

    // Groq analysis
    let groqAnalysis: { analysis: string; homeKeyPlayers: string[]; awayKeyPlayers: string[] } | null = null;

    try {
      const groqPrediction = await getPrediction(
        homeTeam, awayTeam, contextData, matchContext, enhanced
      );
      groqAnalysis = {
        analysis: groqPrediction.analysis,
        homeKeyPlayers: groqPrediction.homeKeyPlayers,
        awayKeyPlayers: groqPrediction.awayKeyPlayers,
      };
    } catch (groqError) {
      const groqMsg = groqError instanceof Error ? groqError.message : String(groqError);
      console.warn(`[predict:v2] Groq fallback: ${groqMsg}`);
      groqAnalysis = {
        analysis: `Análisis estadístico: ${homeTeam} tiene ${enhanced.homeWin}% de probabilidad de victoria con un marcador más probable de ${enhanced.predictedScoreHome}-${enhanced.predictedScoreAway}. Goles esperados: ${homeTeam} ${enhanced.homeExpectedGoals} xG vs ${awayTeam} ${enhanced.awayExpectedGoals} xG. Confianza del modelo: ${enhanced.confidence}.`,
        homeKeyPlayers: [],
        awayKeyPlayers: [],
      };
    }

    // Build prediction object
    const prediction: Prediction = {
      homeWin: enhanced.homeWin,
      draw: enhanced.draw,
      awayWin: enhanced.awayWin,
      predictedScoreHome: enhanced.predictedScoreHome,
      predictedScoreAway: enhanced.predictedScoreAway,
      confidence: enhanced.confidence,
      analysis: groqAnalysis?.analysis || `Predicción estadística: ${homeTeam} ${enhanced.homeWin}% | Empate ${enhanced.draw}% | ${awayTeam} ${enhanced.awayWin}%`,
      keyFactors,
      homeKeyPlayers: groqAnalysis?.homeKeyPlayers || [],
      awayKeyPlayers: groqAnalysis?.awayKeyPlayers || [],
      homeFormLast5: homeForm?.last5?.map(f => f.result) || ['D', 'D', 'D', 'D', 'D'],
      awayFormLast5: awayForm?.last5?.map(f => f.result) || ['D', 'D', 'D', 'D', 'D'],
      homeAttackStrength: enhanced.homeAttack,
      awayAttackStrength: enhanced.awayAttack,
      homeDefenseStrength: enhanced.homeDefense,
      awayDefenseStrength: enhanced.awayDefense,
      homeMidfieldStrength: enhanced.homeMidfield,
      awayMidfieldStrength: enhanced.awayMidfield,
    };

    // Save to data layer (if match exists)
    if (matchInDb) {
      try {
        await db.savePrediction({
          matchId: matchInDb.id,
          homeWin: prediction.homeWin,
          draw: prediction.draw,
          awayWin: prediction.awayWin,
          mostLikelyScore: `${prediction.predictedScoreHome}-${prediction.predictedScoreAway}`,
          expectedGoalsHome: enhanced.homeExpectedGoals,
          expectedGoalsAway: enhanced.awayExpectedGoals,
          over25Probability: enhanced.over25Probability,
          bttsProbability: enhanced.bttsProbability,
          keyFactors: prediction.keyFactors,
          confidence: prediction.confidence,
          dataQualityScore: enhanced.dataQualityScore,
          modelVersion: '2.0',
          homeAttack: enhanced.homeAttack,
          homeDefense: enhanced.homeDefense,
          homeMidfield: enhanced.homeMidfield,
          awayAttack: enhanced.awayAttack,
          awayDefense: enhanced.awayDefense,
          awayMidfield: enhanced.awayMidfield,
          homeElo: enhanced.homeElo,
          awayElo: enhanced.awayElo,
          topScores: enhanced.topScores,
          analysis: prediction.analysis,
          homeKeyPlayers: prediction.homeKeyPlayers,
          awayKeyPlayers: prediction.awayKeyPlayers,
        });
      } catch {
        console.warn('[predict:v2] Could not save prediction to data layer');
      }
    }

    // Also save to in-memory cache for fast access
    setCachedPrediction(homeTeam, awayTeam, prediction);

    return NextResponse.json({
      success: true,
      homeTeam,
      awayTeam,
      matchContext,
      prediction,
      fromCache: false,
      fromDb: false,
      timestamp: new Date().toISOString(),
      dataQuality: enhanced.dataQualityScore,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[predict:v2] FALLO:', errorMsg);

    let userMessage = 'Error generando la predicción. Intenta de nuevo en unos segundos.';
    let statusCode = 500;

    if (errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('GROQ_API_KEY') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
      userMessage = 'Servicio no disponible temporalmente. Estamos trabajando en ello.';
      statusCode = 503;
    } else if (errorMsg.includes('QUOTA') || errorMsg.includes('429') || errorMsg.includes('RESOURCE_EXHAUSTED') || errorMsg.includes('rate limit')) {
      userMessage = 'Demasiadas solicitudes. Intenta de nuevo en un minuto.';
      statusCode = 429;
    }

    return NextResponse.json(
      { error: userMessage, details: process.env.NODE_ENV === 'development' ? errorMsg : undefined },
      { status: statusCode }
    );
  }
}
