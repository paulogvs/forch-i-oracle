// FORCH.i ORACLE — API Route: Post-Match Update
// Submits a real match result and triggers cascade updates.
// This is the pipeline that runs after a match finishes:
// 1. Save real result
// 2. Update team form and dynamic stats
// 3. Recalculate predictions for affected future matches
// 4. Re-simulate tournament (if group stage)
//
// Trigger: POST /api/match-result
// Auth: Requires CRON_SECRET as Bearer token

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { getDataLayerAsync } from '@/lib/data-layer';
import {
  calculateMomentum,
  calculateAdjustedXG,
  calculateCompositeAdjustment,
  type MatchResult as EngineMatchResult,
  type EnhancedPredictionContext,
} from '@/lib/enhanced-engine';
import { calculateEnhancedPrediction } from '@/lib/enhanced-engine';
import { addMatchResult, getDynamicStats } from '@/lib/prediction-store';
import { getKeyFactors } from '@/lib/predictor-engine';
import { batchProcess } from '@/lib/utils';
import { validateCronAuth } from '@/lib/cron-auth';
import { saveBracketAndPredictions } from '@/lib/tournament-results';
import { processMatchEloUpdate, type MatchRound } from '@/lib/elo-update';


export async function POST(request: NextRequest) {
  // Authentication required
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const {
      matchId,
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      homeXG,
      awayXG,
      competition,
    } = body as {
      matchId: string;
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      homeXG?: number;
      awayXG?: number;
      competition?: string;
    };

    // Validation
    if (!matchId || !homeTeam || !awayTeam || homeScore === undefined || awayScore === undefined) {
      return NextResponse.json(
        { error: 'matchId, homeTeam, awayTeam, homeScore, y awayScore son requeridos' },
        { status: 400 }
      );
    }

    const db = await getDataLayerAsync();
    const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'draw';

    console.log(`[match-result] Recording: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);

    // Step 1: Save real result to data layer
    await db.submitMatchResult({
      matchId,
      homeScore,
      awayScore,
      winner,
    });

    // Step 2: Update Elo ratings (persistent — affects all future predictions)
    const match = await db.getMatch(matchId);
    const matchRound = (match?.round || 'group') as MatchRound;
    const eloUpdate = await processMatchEloUpdate(homeTeam, awayTeam, homeScore, awayScore, matchRound, db);

    // Step 3: Update prediction-store (Bayesian engine)
    addMatchResult({
      homeTeam,
      awayTeam,
      homeGoals: homeScore,
      awayGoals: awayScore,
      date: new Date().toISOString().split('T')[0],
      homeXG: homeXG,
      awayXG: awayXG,
    });

    // Step 4: Update team form in data layer
    const now = new Date().toISOString().split('T')[0];
    const comp = competition || 'World Cup';

    // Build match results for both teams
    const homeResults: EngineMatchResult[] = [{
      opponent: awayTeam,
      goalsFor: homeScore,
      goalsAgainst: awayScore,
      result: homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D',
      date: now,
      competition: comp,
    }];

    const awayResults: EngineMatchResult[] = [{
      opponent: homeTeam,
      goalsFor: awayScore,
      goalsAgainst: homeScore,
      result: awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D',
      date: now,
      competition: comp,
    }];

    // Get existing form and append new result
    const existingHomeForm = await db.getTeamForm(homeTeam);
    const existingAwayForm = await db.getTeamForm(awayTeam);

    const homeLast5 = [
      ...(existingHomeForm?.last5 || []),
      {
        result: homeResults[0].result,
        opponent: awayTeam,
        goalsFor: homeScore,
        goalsAgainst: awayScore,
        date: now,
        competition: comp,
      },
    ].slice(-5);

    const awayLast5 = [
      ...(existingAwayForm?.last5 || []),
      {
        result: awayResults[0].result,
        opponent: homeTeam,
        goalsFor: awayScore,
        goalsAgainst: homeScore,
        date: now,
        competition: comp,
      },
    ].slice(-5);

    // Calculate momentum and xG
    const homeMomentum = calculateMomentum([...(existingHomeForm?.last5 || []), ...homeResults]);
    const awayMomentum = calculateMomentum([...(existingAwayForm?.last5 || []), ...awayResults]);

    const homeAdjXG = calculateAdjustedXG(homeTeam, homeLast5.map(m => ({
      goals: m.goalsFor,
      competition: m.competition || 'World Cup',
      date: m.date,
    })));

    const awayAdjXG = calculateAdjustedXG(awayTeam, awayLast5.map(m => ({
      goals: m.goalsFor,
      competition: m.competition || 'World Cup',
      date: m.date,
    })));

    // Get dynamic stats from Bayesian engine
    const homeDynamic = getDynamicStats(homeTeam);
    const awayDynamic = getDynamicStats(awayTeam);

    // Save updated form
    await db.saveTeamForm({
      teamId: homeTeam,
      last5: homeLast5,
      xgFor: homeAdjXG,
      xgAgainst: awayXG || awayScore || 1.0,
      momentum: homeMomentum,
      matchesPlayed: (existingHomeForm?.matchesPlayed || 0) + 1,
      eloDynamic: homeDynamic.elo,
    });

    await db.saveTeamForm({
      teamId: awayTeam,
      last5: awayLast5,
      xgFor: awayAdjXG,
      xgAgainst: homeXG || homeScore || 1.0,
      momentum: awayMomentum,
      matchesPlayed: (existingAwayForm?.matchesPlayed || 0) + 1,
      eloDynamic: awayDynamic.elo,
    });

    // Step 5: Find future matches for both teams and recalculate predictions
    const upcomingMatches = await db.getUpcomingMatches();
    const affectedMatches = upcomingMatches.filter(
      m => m.homeTeamId === homeTeam || m.awayTeamId === homeTeam ||
           m.homeTeamId === awayTeam || m.awayTeamId === awayTeam
    );

    // Recalculate predictions for affected matches using batch processing
    let recalculated = 0;

    const recalcOne = async (match: { id: string; homeTeamId: string; awayTeamId: string; venue?: string }) => {
      // Delete stale prediction first
      await db.deletePrediction(match.id).catch(() => {});

      // Get updated team forms
      const [mHomeForm, mAwayForm] = await Promise.all([
        db.getTeamForm(match.homeTeamId),
        db.getTeamForm(match.awayTeamId),
      ]);

      const homeCtx: EnhancedPredictionContext = {
        teamName: match.homeTeamId,
        venue: match.venue,
        recentMatches: mHomeForm?.last5?.map(f => ({
          opponent: f.opponent,
          goalsFor: f.goalsFor,
          goalsAgainst: f.goalsAgainst,
          result: f.result,
          date: f.date,
          competition: (f as any).competition || 'World Cup',
        })),
        daysSinceLastMatch: mHomeForm?.updatedAt
          ? Math.floor((Date.now() - new Date(mHomeForm.updatedAt).getTime()) / 86400000)
          : undefined,
      };

      const awayCtx: EnhancedPredictionContext = {
        teamName: match.awayTeamId,
        venue: match.venue,
        recentMatches: mAwayForm?.last5?.map(f => ({
          opponent: f.opponent,
          goalsFor: f.goalsFor,
          goalsAgainst: f.goalsAgainst,
          result: f.result,
          date: f.date,
          competition: (f as any).competition || 'World Cup',
        })),
        daysSinceLastMatch: mAwayForm?.updatedAt
          ? Math.floor((Date.now() - new Date(mAwayForm.updatedAt).getTime()) / 86400000)
          : undefined,
      };

      const enhanced = await calculateEnhancedPrediction(match.homeTeamId, match.awayTeamId, homeCtx, awayCtx);
      const homeFormArray = mHomeForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined;
      const awayFormArray = mAwayForm?.last5?.map(f => f.result) as ('W' | 'D' | 'L')[] | undefined;
      const factors = getKeyFactors(enhanced, match.homeTeamId, match.awayTeamId, homeFormArray, awayFormArray);

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
        homeAttack: enhanced.homeAttack,
        homeDefense: enhanced.homeDefense,
        homeMidfield: enhanced.homeMidfield,
        awayAttack: enhanced.awayAttack,
        awayDefense: enhanced.awayDefense,
        awayMidfield: enhanced.awayMidfield,
        homeElo: enhanced.homeElo,
        awayElo: enhanced.awayElo,
        topScores: enhanced.topScores,
      });

      return true;
    }

    if (affectedMatches.length > 0) {
      const results = await batchProcess(affectedMatches, recalcOne, 16);
      recalculated = results.filter(Boolean).length;
    }

    console.log(`[match-result] Auto-recalculated ${recalculated} predictions for affected teams`);

    // Step 6: Re-simulate tournament if this is a group stage match
    if (match && match.round === 'group') {
      console.log('[match-result] Group stage match — tournament re-simulation recommended');
    }

    // Invalidate caches so next request picks up new data
    revalidateTag('fixture');
    revalidateTag('tournament');

    // AUTO-SIMULATE: After match result, re-simulate tournament directly (no HTTP)
    try {
      const { simulateTournamentMulti } = await import('@/lib/tournament-sim');
      const allResults = await db.getMatchResults();
      const simResult = await simulateTournamentMulti(5000, allResults);

      // Persist bracket + all knockout match predictions (single source of truth)
      await saveBracketAndPredictions(db, simResult.bracket);

      // Store champion probabilities
      await db.saveTournamentProbs(simResult.top8.map(c => ({
        teamId: c.team,
        championProb: c.pct,
        simulationsCount: c.wins,
        totalSimulations: 100,
      })));

      // Store consensus bracket hash to avoid redundant computation
      const resultsHash = allResults
        .map((r: any) => `${r.matchId}:${r.homeScore}-${r.awayScore}`)
        .join('|');
      await db.setKeyValue('consensusBracketHash', resultsHash);

      console.log(`[match-result] Auto-simulate complete: champion=${simResult.top8[0]?.team} (${simResult.top8[0]?.pct}%)`);
    } catch (err) {
      console.warn('[match-result] Auto-simulate error:', err);
    }

    return NextResponse.json({
      success: true,
      message: `Resultado registrado: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`,
      winner,
      affectedMatches: affectedMatches.map(m => m.id),
      homeFormUpdated: true,
      awayFormUpdated: true,
      predictionsRecalculated: recalculated,
      revalidated: ['fixture', 'tournament'],
      timestamp: new Date().toISOString(),
      elo: {
        home: {
          team: homeTeam,
          before: eloUpdate.homeEloBefore,
          after: eloUpdate.homeEloAfter,
          delta: eloUpdate.homeDelta,
        },
        away: {
          team: awayTeam,
          before: eloUpdate.awayEloBefore,
          after: eloUpdate.awayEloAfter,
          delta: eloUpdate.awayDelta,
        },
      },
      homeDynamic: {
        elo: homeDynamic.elo,
        momentum: homeMomentum,
        matchesPlayed: homeDynamic.matchesPlayed,
      },
      awayDynamic: {
        elo: awayDynamic.elo,
        momentum: awayMomentum,
        matchesPlayed: awayDynamic.matchesPlayed,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[match-result] Error:', msg);

    return NextResponse.json(
      { error: 'Error registrando resultado del partido', details: msg },
      { status: 500 }
    );
  }
}
