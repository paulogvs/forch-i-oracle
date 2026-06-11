// FORCH.i ORACLE — API Route: Full Tournament Fixture Prediction (v2 with Data Layer)
// Predicts ALL 128 matches with scores using enhanced engine + data layer caching.
import { NextRequest, NextResponse } from 'next/server';
import { ALL_MATCHES, MATCHES_BY_GROUP } from '@/lib/matches';
import { calculateStatisticalPrediction } from '@/lib/predictor-engine';
import { predictMatchDynamic, addMatchResult, getResultsCount } from '@/lib/prediction-store';
import { calculateEnhancedPrediction, type EnhancedPredictionContext } from '@/lib/enhanced-engine';
import { getDataLayer } from '@/lib/data-layer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { useDynamic = true, useEnhanced = true, realResults = [] } = body;

    const db = getDataLayer();

    // Ingest any real results
    for (const r of realResults) {
      addMatchResult(r);
      await db.submitMatchResult({
        matchId: r.matchId || `${r.homeTeam}_vs_${r.awayTeam}`,
        homeScore: r.homeGoals || r.homeScore || 0,
        awayScore: r.awayGoals || r.awayScore || 0,
        winner: (r.homeGoals || r.homeScore || 0) > (r.awayGoals || r.awayScore || 0)
          ? r.homeTeam : (r.awayGoals || r.awayScore || 0) > (r.homeGoals || r.homeScore || 0)
            ? r.awayTeam : 'draw',
      });
    }

    // Get team forms from data layer
    const teamFormsCache = new Map<string, Awaited<ReturnType<typeof db.getTeamForm>>>();

    const getTeamFormCached = async (teamName: string) => {
      if (!teamFormsCache.has(teamName)) {
        teamFormsCache.set(teamName, await db.getTeamForm(teamName));
      }
      return teamFormsCache.get(teamName)!;
    };

    const fixture: any[] = [];
    const groupStandings: Record<string, any[]> = {};

    // ═══════════════════════════════════════════════════
    // PHASE 1: Predict group stage
    // ═══════════════════════════════════════════════════

    for (const group of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
      const groupMatches = MATCHES_BY_GROUP[group] || [];
      const standings: Record<string, { pts: number; gf: number; ga: number; gd: number; played: number }> = {};

      // Initialize standings
      for (const m of groupMatches) {
        standings[m.homeTeam] = standings[m.homeTeam] || { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
        standings[m.awayTeam] = standings[m.awayTeam] || { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 };
      }

      // Predict each match
      for (const match of groupMatches) {
        let prediction;

        if (useEnhanced) {
          // Use enhanced engine with data layer context
          const homeForm = await getTeamFormCached(match.homeTeam);
          const awayForm = await getTeamFormCached(match.awayTeam);

          const homeContext: EnhancedPredictionContext = {
            teamName: match.homeTeam,
            venue: match.venue,
            recentMatches: homeForm?.last5?.map(f => ({
              opponent: f.opponent,
              goalsFor: f.goalsFor,
              goalsAgainst: f.goalsAgainst,
              result: f.result,
              date: f.date,
            })),
          };

          const awayContext: EnhancedPredictionContext = {
            teamName: match.awayTeam,
            venue: match.venue,
            recentMatches: awayForm?.last5?.map(f => ({
              opponent: f.opponent,
              goalsFor: f.goalsFor,
              goalsAgainst: f.goalsAgainst,
              result: f.result,
              date: f.date,
            })),
          };

          const enhanced = await calculateEnhancedPrediction(match.homeTeam, match.awayTeam, homeContext, awayContext);
          prediction = {
            homeWin: enhanced.homeWin,
            draw: enhanced.draw,
            awayWin: enhanced.awayWin,
            homeGoals: enhanced.predictedScoreHome,
            awayGoals: enhanced.predictedScoreAway,
            confidence: enhanced.confidence,
            homeXG: enhanced.homeExpectedGoals,
            awayXG: enhanced.awayExpectedGoals,
            dataQuality: enhanced.dataQualityScore,
          };

          // Also save prediction to data layer
          try {
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
              keyFactors: [],
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
          } catch {
            // Non-critical if save fails
          }
        } else if (useDynamic) {
          const dyn = predictMatchDynamic(match.homeTeam, match.awayTeam);
          prediction = {
            homeWin: dyn.homeWinPct,
            draw: dyn.drawPct,
            awayWin: dyn.awayWinPct,
            homeGoals: dyn.predictedScore[0],
            awayGoals: dyn.predictedScore[1],
            confidence: dyn.confidence,
            homeXG: dyn.homeExpectedGoals,
            awayXG: dyn.awayExpectedGoals,
          };
        } else {
          const stat = await calculateStatisticalPrediction(match.homeTeam, match.awayTeam);
          prediction = {
            homeWin: stat.homeWin,
            draw: stat.draw,
            awayWin: stat.awayWin,
            homeGoals: stat.predictedScoreHome,
            awayGoals: stat.predictedScoreAway,
            confidence: stat.confidence,
            homeXG: stat.homeExpectedGoals,
            awayXG: stat.awayExpectedGoals,
          };
        }

        fixture.push({
          id: match.id,
          group: match.group,
          date: match.date,
          time: match.time,
          venue: match.venue,
          city: match.city,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          round: 'group',
          predictedScore: [prediction.homeGoals, prediction.awayGoals],
          confidence: prediction.confidence,
          homeWinPct: prediction.homeWin,
          drawPct: prediction.draw,
          awayWinPct: prediction.awayWin,
          xG: [prediction.homeXG, prediction.awayXG],
          dataQuality: prediction.dataQuality,
        });

        // Update standings
        const h = standings[match.homeTeam];
        const a = standings[match.awayTeam];
        h.played++; a.played++;
        h.gf += prediction.homeGoals;
        h.ga += prediction.awayGoals;
        a.gf += prediction.awayGoals;
        a.ga += prediction.homeGoals;
        h.gd = h.gf - h.ga;
        a.gd = a.gf - a.ga;

        if (prediction.homeGoals > prediction.awayGoals) {
          h.pts += 3;
        } else if (prediction.homeGoals < prediction.awayGoals) {
          a.pts += 3;
        } else {
          h.pts += 1;
          a.pts += 1;
        }
      }

      // Sort and store standings
      const sorted = Object.entries(standings)
        .map(([name, s]) => ({ name, ...s }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

      groupStandings[group] = sorted;
    }

    // ═══════════════════════════════════════════════════
    // PHASE 2: Predict knockout (TBD until group results)
    // ═══════════════════════════════════════════════════

    const knockoutMatches = ALL_MATCHES.filter(m => m.round !== 'group');

    for (const match of knockoutMatches) {
      fixture.push({
        id: match.id,
        group: match.group,
        date: match.date,
        time: match.time,
        venue: match.venue,
        city: match.city,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        round: match.round,
        predictedScore: null,
        confidence: null,
        homeWinPct: null,
        drawPct: null,
        awayWinPct: null,
        xG: null,
      });
    }

    return NextResponse.json({
      success: true,
      fixture,
      groupStandings,
      totalMatches: fixture.length,
      groupStageMatches: 72,
      knockoutMatches: fixture.length - 72,
      useDynamic,
      useEnhanced,
      realResultsIngested: realResults.length,
      totalRealResults: getResultsCount(),
    });

  } catch (error) {
    console.error('[fixture:v2] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate fixture' },
      { status: 500 }
    );
  }
}
