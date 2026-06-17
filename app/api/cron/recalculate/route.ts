// FORCH.i ORACLE — Cron Job: Recalculate Predictions (v3 Ensemble)
// Recalculates predictions using the 4-model ensemble for maximum accuracy.
// Schedule: Every 12 hours (or after each match day)
// Trigger: GET /api/cron/recalculate

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { calculateEnsemblePrediction, addCalibrationResult } from '@/lib/ensemble-engine';
import { addMatchResult } from '@/lib/prediction-store';
import { getPrediction as getGroqPrediction } from '@/lib/groq';
import { validateCronAuth } from '@/lib/cron-auth';

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = await getDataLayerAsync();
  const results = {
    matchesProcessed: 0,
    predictionsSaved: 0,
    errors: [] as string[],
  };

  try {
    console.log('[cron:recalculate] Starting prediction recalculation...');

    // Feed all real results into prediction-store so the Bayesian Dynamic model
    // has fresh team form data before we compute ensemble predictions.
    const allResults = await db.getMatchResults();
    for (const r of allResults) {
      const match = await db.getMatch(r.matchId);
      if (match) {
        addMatchResult({
          homeTeam: match.homeTeamId,
          awayTeam: match.awayTeamId,
          homeGoals: r.homeScore,
          awayGoals: r.awayScore,
          date: match.matchDate || new Date().toISOString().split('T')[0],
        });
      }
    }
    console.log(`[cron:recalculate] Fed ${allResults.length} real results into dynamic model`);

    // Get all upcoming/scheduled matches
    const matches = await db.getUpcomingMatches();
    console.log(`[cron:recalculate] Found ${matches.length} upcoming matches`);

    for (const match of matches) {
      try {
        console.log(`[cron:recalculate] Predicting: ${match.homeTeamId} vs ${match.awayTeamId}`);

        // Use ensemble engine (4-model blend for maximum accuracy)
        const ensemble = await calculateEnsemblePrediction(match.homeTeamId, match.awayTeamId);

        // Build key factors
        const factors = ensemble.keyFactors;

        // Get Groq analysis (non-blocking, with fallback)
        let analysis: string | undefined;
        let homeKeyPlayers: string[] | undefined;
        let awayKeyPlayers: string[] | undefined;

        try {
          const groqResult = await getGroqPrediction(
            match.homeTeamId,
            match.awayTeamId,
            `Ensemble: DC=${ensemble.weights.dixonColes.toFixed(2)} Bay=${ensemble.weights.bayesianDynamic.toFixed(2)} Elo=${ensemble.weights.eloPoisson.toFixed(2)} | Agreement=${ensemble.agreement.agreementScore.toFixed(2)} | Entropy=${ensemble.uncertainty.entropy.toFixed(2)}`,
            match.venue ? {
              id: match.id,
              group: match.groupChar || '',
              matchday: match.matchNumber || 1,
              date: match.matchDate || '',
              time: match.matchTime || '',
              venue: match.venue,
              city: match.city || '',
            } : null,
            ensemble.models.eloPoisson  // Pass the StatisticalPrediction from the ensemble's Elo model
          );
          analysis = groqResult.analysis;
          homeKeyPlayers = groqResult.homeKeyPlayers;
          awayKeyPlayers = groqResult.awayKeyPlayers;
        } catch (groqError) {
          console.warn(`[cron:recalculate] Groq fallback for ${match.homeTeamId} vs ${match.awayTeamId}`);
          analysis = `${match.homeTeamId} (${ensemble.homeWin}%) vs ${match.awayTeamId} (${ensemble.awayWin}%) — Marcador: ${ensemble.predictedScoreHome}-${ensemble.predictedScoreAway} — Confianza: ${ensemble.confidence} (${ensemble.confidenceScore}/100)`;
        }

        // Save prediction
        await db.savePrediction({
          matchId: match.id,
          homeWin: ensemble.homeWin,
          draw: ensemble.draw,
          awayWin: ensemble.awayWin,
          mostLikelyScore: `${ensemble.predictedScoreHome}-${ensemble.predictedScoreAway}`,
          expectedGoalsHome: ensemble.homeExpectedGoals,
          expectedGoalsAway: ensemble.awayExpectedGoals,
          over25Probability: ensemble.over25Probability,
          bttsProbability: ensemble.bttsProbability,
          keyFactors: factors,
          confidence: ensemble.confidence,
          dataQualityScore: Math.round(ensemble.agreement.agreementScore * 100),
          modelVersion: '3.0-ensemble',
          momentum: ensemble.models.dynamic.hasRealData ? 0 : 0,
          fatigueImpact: 0,
          homeAdvantageBonus: 0,
          injuryPenalty: 0,
          homeAttack: ensemble.models.eloPoisson.homeAttack,
          homeDefense: ensemble.models.eloPoisson.homeDefense,
          homeMidfield: ensemble.models.eloPoisson.homeMidfield,
          awayAttack: ensemble.models.eloPoisson.awayAttack,
          awayDefense: ensemble.models.eloPoisson.awayDefense,
          awayMidfield: ensemble.models.eloPoisson.awayMidfield,
          homeElo: ensemble.models.eloPoisson.homeElo,
          awayElo: ensemble.models.eloPoisson.awayElo,
          topScores: ensemble.topScores,
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
      jobName: 'recalculate',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: results.predictionsSaved,
    });

    console.log(`[cron:recalculate] Completed in ${duration}ms: ${results.predictionsSaved} predictions saved`);

    // Ingest now triggers simulate separately after recalculate completes.
    // No redundant simulate call here — avoids double simulation per ingest cycle.

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
      jobName: 'recalculate',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
