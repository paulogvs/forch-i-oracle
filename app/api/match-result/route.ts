// FORCH.i ORACLE — API Route: Post-Match Update
// Submits a real match result and triggers cascade updates.
// This is the pipeline that runs after a match finishes:
// 1. Save real result
// 2. Update team form and dynamic stats
// 3. Recalculate predictions for affected future matches
// 4. Re-simulate tournament (if group stage)
//
// Trigger: POST /api/match-result

import { NextRequest, NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';
import {
  calculateMomentum,
  calculateAdjustedXG,
  type MatchResult as EngineMatchResult,
} from '@/lib/enhanced-engine';
import { addMatchResult, getDynamicStats } from '@/lib/prediction-store';

export async function POST(request: NextRequest) {
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

    const db = getDataLayer();
    const winner = homeScore > awayScore ? homeTeam : awayScore > homeScore ? awayTeam : 'draw';

    console.log(`[match-result] Recording: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`);

    // Step 1: Save real result to data layer
    await db.submitMatchResult({
      matchId,
      homeScore,
      awayScore,
      winner,
    });

    // Step 2: Update prediction-store (Bayesian engine)
    addMatchResult({
      homeTeam,
      awayTeam,
      homeGoals: homeScore,
      awayGoals: awayScore,
      date: new Date().toISOString().split('T')[0],
      homeXG: homeXG,
      awayXG: awayXG,
    });

    // Step 3: Update team form in data layer
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
      xgAgainst: homeAdjXG * 0.8,
      momentum: homeMomentum,
      matchesPlayed: (existingHomeForm?.matchesPlayed || 0) + 1,
      eloDynamic: homeDynamic.elo,
    });

    await db.saveTeamForm({
      teamId: awayTeam,
      last5: awayLast5,
      xgFor: awayAdjXG,
      xgAgainst: awayAdjXG * 0.8,
      momentum: awayMomentum,
      matchesPlayed: (existingAwayForm?.matchesPlayed || 0) + 1,
      eloDynamic: awayDynamic.elo,
    });

    // Step 4: Find future matches for both teams and mark predictions as needing recalculation
    const upcomingMatches = await db.getUpcomingMatches();
    const affectedMatches = upcomingMatches.filter(
      m => m.homeTeamId === homeTeam || m.awayTeamId === homeTeam ||
           m.homeTeamId === awayTeam || m.awayTeamId === awayTeam
    );

    // Delete stale predictions for affected matches
    for (const match of affectedMatches) {
      await db.deletePrediction(match.id);
    }

    console.log(`[match-result] Deleted ${affectedMatches.length} stale predictions for affected teams`);

    // Step 5: Re-simulate tournament if this is a group stage match
    const match = await db.getMatch(matchId);
    if (match && match.round === 'group') {
      console.log('[match-result] Group stage match — tournament re-simulation recommended');
    }

    return NextResponse.json({
      success: true,
      message: `Resultado registrado: ${homeTeam} ${homeScore}-${awayScore} ${awayTeam}`,
      winner,
      affectedMatches: affectedMatches.map(m => m.id),
      homeFormUpdated: true,
      awayFormUpdated: true,
      predictionsInvalidated: affectedMatches.length,
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
