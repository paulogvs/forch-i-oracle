// FORCH.i ORACLE — Cron Job: Recalculate Predictions
// Vercel Cron job that recalculates predictions for all upcoming matches.
// Schedule: Every 12 hours (or after each match day)
// Trigger: GET /api/cron/recalculate

import { NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';
import { calculateEnhancedPrediction, type EnhancedPredictionContext } from '@/lib/enhanced-engine';
import { getKeyFactors } from '@/lib/predictor-engine';
import { getPrediction as getGroqPrediction } from '@/lib/groq';
import { validateCronAuth } from '@/lib/cron-auth';

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = getDataLayer();
  const results = {
    matchesProcessed: 0,
    predictionsSaved: 0,
    errors: [] as string[],
  };

  try {
    console.log('[cron:recalculate] Starting prediction recalculation...');

    // Get all upcoming/scheduled matches
    const matches = await db.getUpcomingMatches();
    console.log(`[cron:recalculate] Found ${matches.length} upcoming matches`);

    for (const match of matches) {
      try {
        console.log(`[cron:recalculate] Predicting: ${match.homeTeamId} vs ${match.awayTeamId}`);

        // Get team form data
        const homeForm = await db.getTeamForm(match.homeTeamId);
        const awayForm = await db.getTeamForm(match.awayTeamId);

        // Build enhanced context
        const homeContext: EnhancedPredictionContext = {
          teamName: match.homeTeamId,
          venue: match.venue,
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
          teamName: match.awayTeamId,
          venue: match.venue,
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
        const enhanced = await calculateEnhancedPrediction(
          match.homeTeamId,
          match.awayTeamId,
          homeContext,
          awayContext
        );

        // Build key factors
        const homeFormArray = homeForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined;
        const awayFormArray = awayForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined;

        const factors = getKeyFactors(
          enhanced,
          match.homeTeamId,
          match.awayTeamId,
          homeFormArray,
          awayFormArray
        );

        // Get Groq analysis (non-blocking, with fallback)
        let analysis: string | undefined;
        let homeKeyPlayers: string[] | undefined;
        let awayKeyPlayers: string[] | undefined;

        try {
          const groqResult = await getGroqPrediction(
            match.homeTeamId,
            match.awayTeamId,
            `Forma: ${match.homeTeamId} ${homeFormArray?.join('') || 'N/A'} | ${match.awayTeamId} ${awayFormArray?.join('') || 'N/A'}`,
            match.venue ? {
              id: match.id,
              group: match.groupChar || '',
              matchday: match.matchNumber || 1,
              date: match.matchDate || '',
              time: match.matchTime || '',
              venue: match.venue,
              city: match.city || '',
            } : null,
            enhanced
          );
          analysis = groqResult.analysis;
          homeKeyPlayers = groqResult.homeKeyPlayers;
          awayKeyPlayers = groqResult.awayKeyPlayers;
        } catch (groqError) {
          console.warn(`[cron:recalculate] Groq fallback for ${match.homeTeamId} vs ${match.awayTeamId}`);
          analysis = `${match.homeTeamId} (${enhanced.homeWin}%) vs ${match.awayTeamId} (${enhanced.awayWin}%) — Marcador: ${enhanced.predictedScoreHome}-${enhanced.predictedScoreAway}`;
        }

        // Save prediction
        await db.savePrediction({
          matchId: match.id,
          homeWin: enhanced.homeWin,
          draw: enhanced.draw,
          awayWin: enhanced.awayWin,
          mostLikelyScore: `${enhanced.predictedScoreHome}-${enhanced.predictedScoreAway}`,
          expectedGoalsHome: enhanced.homeExpectedGoals,
          expectedGoalsAway: enhanced.awayExpectedGoals,
          over25Probability: enhanced.over25Probability,
          bttsProbability: enhanced.bttsProbability,
          keyFactors: factors,
          confidence: enhanced.confidence,
          dataQualityScore: enhanced.dataQualityScore,
          modelVersion: '2.0',
          momentum: enhanced.momentum,
          fatigueImpact: enhanced.fatigueImpact,
          homeAdvantageBonus: enhanced.homeAdvantageBonus,
          injuryPenalty: enhanced.injuryPenalty,
          homeAttack: enhanced.homeAttack,
          homeDefense: enhanced.homeDefense,
          homeMidfield: enhanced.homeMidfield,
          awayAttack: enhanced.awayAttack,
          awayDefense: enhanced.awayDefense,
          awayMidfield: enhanced.awayMidfield,
          homeElo: enhanced.homeElo,
          awayElo: enhanced.awayElo,
          topScores: enhanced.topScores,
          analysis,
          homeKeyPlayers,
          awayKeyPlayers,
        });

        results.matchesProcessed++;
        results.predictionsSaved++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[cron:recalculate] Error for ${match.homeTeamId} vs ${match.awayTeamId}:`, msg);
        results.errors.push(`${match.homeTeamId} vs ${match.awayTeamId}: ${msg}`);
      }
    }

    const duration = Date.now() - startTime;

    // Update cron status
    await db.updateCronStatus({
      jobName: 'recalculate-predictions',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: results.predictionsSaved,
    });

    console.log(`[cron:recalculate] Completed in ${duration}ms: ${results.predictionsSaved} predictions saved`);

    return NextResponse.json({
      success: true,
      duration,
      matchesProcessed: results.matchesProcessed,
      predictionsSaved: results.predictionsSaved,
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:recalculate] Fatal error:', msg);

    await db.updateCronStatus({
      jobName: 'recalculate-predictions',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
