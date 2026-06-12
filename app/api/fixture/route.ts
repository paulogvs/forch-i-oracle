// FORCH.i ORACLE — API Route: Full Tournament Fixture Prediction (v2 with Data Layer)
// Predicts ALL 128 matches with scores using enhanced engine + data layer caching.
import { NextRequest, NextResponse } from 'next/server';
import { ALL_MATCHES, MATCHES_BY_GROUP } from '@/lib/matches';
import { calculateStatisticalPrediction } from '@/lib/predictor-engine';
import { predictMatchDynamic, addMatchResult, getResultsCount } from '@/lib/prediction-store';
import { calculateEnhancedPrediction, type EnhancedPredictionContext } from '@/lib/enhanced-engine';
import { getDataLayerAsync } from '@/lib/data-layer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { useDynamic = true, useEnhanced: useEnhancedFlag = true, realResults = [] } = body;

    const db = await getDataLayerAsync();

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

        if (useEnhancedFlag) {
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
    // PHASE 2: Predict knockout (resolve group stage placeholders first)
    // ═══════════════════════════════════════════════════

    // Build resolved knockout teams from simulated group standings
    const knockoutMatches = ALL_MATCHES.filter(m => m.round !== 'group');

    // Resolve group stage to get qualified teams
    const groupQualified = resolveGroupQualifiers(groupStandings);

    // Simulate knockout bracket to resolve all placeholders
    const knockoutResults = await simulateKnockoutPhase(groupQualified, getTeamFormCached, useEnhancedFlag);

    // Map knockout results back to fixture entries
    const knockoutMap = new Map<string, any>();
    for (const result of knockoutResults) {
      knockoutMap.set(result.id, result);
    }

    for (const match of knockoutMatches) {
      const koResult = knockoutMap.get(match.id);
      fixture.push({
        id: match.id,
        group: match.group,
        date: match.date,
        time: match.time,
        venue: match.venue,
        city: match.city,
        homeTeam: koResult?.homeTeam || match.homeTeam,
        awayTeam: koResult?.awayTeam || match.awayTeam,
        round: match.round,
        predictedScore: koResult?.predictedScore || null,
        confidence: koResult?.confidence || null,
        homeWinPct: koResult?.homeWinPct || null,
        drawPct: koResult?.drawPct || null,
        awayWinPct: koResult?.awayWinPct || null,
        xG: koResult?.xG || null,
      });
    }

    // ═══════════════════════════════════════════════════
    // PHASE 3: Enrich with stored Groq analysis
    // ═══════════════════════════════════════════════════
    const matchIds = fixture.map((m: any) => m.id);
    let storedPredictions: any[] = [];
    try {
      storedPredictions = await db.getPredictionsForMatches(matchIds);
    } catch {
      // Non-critical — analysis just won't show
    }

    // Build a map of matchId → stored Groq data
    const analysisMap = new Map<string, { analysis: string; homeKeyPlayers: string[]; awayKeyPlayers: string[] }>();
    for (const sp of storedPredictions) {
      if (sp.analysis || sp.homeKeyPlayers?.length || sp.awayKeyPlayers?.length) {
        analysisMap.set(sp.matchId, {
          analysis: sp.analysis || '',
          homeKeyPlayers: sp.homeKeyPlayers || [],
          awayKeyPlayers: sp.awayKeyPlayers || [],
        });
      }
    }

    // Enrich fixture with stored Groq analysis
    for (const m of fixture) {
      const stored = analysisMap.get(m.id);
      if (stored) {
        m.analysis = stored.analysis;
        m.homeKeyPlayers = stored.homeKeyPlayers;
        m.awayKeyPlayers = stored.awayKeyPlayers;
      }
    }

    return NextResponse.json({
      success: true,
      fixture,
      groupStandings,
      totalMatches: fixture.length,
      groupStageMatches: 72,
      knockoutMatches: fixture.length - 72,
      useDynamic,
      useEnhanced: useEnhancedFlag,
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

// ═══════════════════════════════════════════════════════════════
// KNOCKOUT RESOLUTION HELPERS
// ═══════════════════════════════════════════════════════════════

interface QualifiedTeams {
  groupWinners: Map<string, string>;
  groupRunnersUp: Map<string, string>;
  bestThirdPlaces: string[];
  groupStandings: Record<string, any[]>;
  thirdPlaceGroups: { name: string; group: string }[];
}

function resolveGroupQualifiers(groupStandings: Record<string, any[]>): QualifiedTeams {
  const qualified: QualifiedTeams = {
    groupWinners: new Map(),
    groupRunnersUp: new Map(),
    bestThirdPlaces: [],
    groupStandings,
    thirdPlaceGroups: [],
  };

  const allGroups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[] = [];

  for (const group of allGroups) {
    const standings = groupStandings[group];
    if (!standings || standings.length < 3) continue;

    qualified.groupWinners.set(group, standings[0].name);
    qualified.groupRunnersUp.set(group, standings[1].name);
    thirdPlaces.push({
      name: standings[2].name,
      pts: standings[2].pts,
      gd: standings[2].gd,
      gf: standings[2].gf,
      group,
    });
  }

  thirdPlaces.sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf
  );
  qualified.bestThirdPlaces = thirdPlaces.slice(0, 8).map(tp => tp.name);
  qualified.thirdPlaceGroups = thirdPlaces.slice(0, 8).map(tp => ({ name: tp.name, group: tp.group }));

  return qualified;
}

function resolveTeamSlot(
  slot: string,
  qualified: QualifiedTeams,
  winners: Map<string, string>,
  losers?: Map<string, string>
): string {
  // Already resolved winner from previous knockout round
  if (slot.startsWith('W-')) {
    return winners.get(slot) || 'TBD';
  }
  // Loser from previous knockout round (for third place match)
  if (slot.startsWith('L-') && losers) {
    return losers.get(slot) || 'TBD';
  }

  // Group position: "1A" = 1st of Group A, "2B" = 2nd of Group B
  if (slot.length === 2 && /^[12]/.test(slot[0]) && /[A-L]/.test(slot[1])) {
    const pos = parseInt(slot[0]);
    const group = slot[1];
    if (pos === 1) return qualified.groupWinners.get(group) || 'TBD';
    if (pos === 2) return qualified.groupRunnersUp.get(group) || 'TBD';
  }

  // Third place slots: "3B", "3E", "3F", "3G" etc.
  // These are single group references, not criteria strings
  if (slot.length === 2 && slot[0] === '3') {
    const group = slot[1];
    const standings = (qualified as any).groupStandings?.[group];
    if (standings && standings.length >= 3) {
      return standings[2].name;
    }
    // Fallback: find the third-place team from that group
    for (const tp of qualified.bestThirdPlaces) {
      return tp;
    }
    return 'TBD';
  }

  // Third place criteria like "3B/3E/3F/3G" — return the best third from those groups
  if (slot.includes('3')) {
    const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    for (const tp of qualified.bestThirdPlaces) {
      // Check if this third-place team's group is in the criteria
      const tpGroupInfo = (qualified as any).thirdPlaceGroups?.find((t: any) => t.name === tp);
      if (tpGroupInfo && groupLetters.includes(tpGroupInfo.group)) {
        return tp;
      }
    }
    // Fallback: return first best third that matches any group
    for (const tp of qualified.bestThirdPlaces) {
      return tp;
    }
    return 'TBD';
  }

  return 'TBD';
}

async function predictSingleMatch(
  homeTeam: string,
  awayTeam: string,
  matchId: string,
  getTeamFormCached: (name: string) => Promise<any>,
  useEnhanced: boolean
): Promise<any> {
  if (homeTeam === 'TBD' || awayTeam === 'TBD') {
    return {
      id: matchId,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      predictedScore: null,
      confidence: null,
      homeWinPct: null,
      drawPct: null,
      awayWinPct: null,
      xG: null,
    };
  }

  let prediction;

  if (useEnhanced) {
    const homeForm = await getTeamFormCached(homeTeam);
    const awayForm = await getTeamFormCached(awayTeam);

    const homeContext: EnhancedPredictionContext = {
      teamName: homeTeam,
      recentMatches: homeForm?.last5?.map((f: any) => ({
        opponent: f.opponent,
        goalsFor: f.goalsFor,
        goalsAgainst: f.goalsAgainst,
        result: f.result,
        date: f.date,
      })),
    };

    const awayContext: EnhancedPredictionContext = {
      teamName: awayTeam,
      recentMatches: awayForm?.last5?.map((f: any) => ({
        opponent: f.opponent,
        goalsFor: f.goalsFor,
        goalsAgainst: f.goalsAgainst,
        result: f.result,
        date: f.date,
      })),
    };

    const enhanced = await calculateEnhancedPrediction(homeTeam, awayTeam, homeContext, awayContext);
    prediction = {
      homeWin: enhanced.homeWin,
      draw: enhanced.draw,
      awayWin: enhanced.awayWin,
      homeGoals: enhanced.predictedScoreHome,
      awayGoals: enhanced.predictedScoreAway,
      confidence: enhanced.confidence,
      homeXG: enhanced.homeExpectedGoals,
      awayXG: enhanced.awayExpectedGoals,
    };
  } else {
    const stat = await calculateStatisticalPrediction(homeTeam, awayTeam);
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

  return {
    id: matchId,
    homeTeam,
    awayTeam,
    predictedScore: [prediction.homeGoals, prediction.awayGoals],
    confidence: prediction.confidence,
    homeWinPct: prediction.homeWin,
    drawPct: prediction.draw,
    awayWinPct: prediction.awayWin,
    xG: [prediction.homeXG, prediction.awayXG],
    winner: prediction.homeGoals > prediction.awayGoals ? homeTeam :
            prediction.homeGoals < prediction.awayGoals ? awayTeam : homeTeam, // Home wins draws in knockout
  };
}

async function simulateKnockoutPhase(
  qualified: QualifiedTeams,
  getTeamFormCached: (name: string) => Promise<any>,
  useEnhanced: boolean
): Promise<any[]> {
  const results: any[] = [];
  const winners = new Map<string, string>();
  const losers = new Map<string, string>();
  const usedThirdPlaces = new Set<string>(); // Track used third-place teams

  // Helper to get a unique third-place team for a slot
  const getThirdPlace = (slot: string): string => {
    const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    // Find the best third-place team whose group is in the criteria and hasn't been used
    for (const tp of qualified.bestThirdPlaces) {
      const tpInfo = qualified.thirdPlaceGroups.find(t => t.name === tp);
      if (tpInfo && groupLetters.includes(tpInfo.group) && !usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    // Fallback: any unused best third-place
    for (const tp of qualified.bestThirdPlaces) {
      if (!usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    return 'TBD';
  };

  // ═══════════════════════════════════════════════════
  // ROUND OF 32 — 16 matches
  // ═══════════════════════════════════════════════════

  const r32Slots = [
    { id: 'R32-1', home: '1A', away: '3B/3E/3F/3G' },
    { id: 'R32-2', home: '1C', away: '3A/3B/3C/3D' },
    { id: 'R32-3', home: '1E', away: '3D/3E/3F' },
    { id: 'R32-4', home: '1G', away: '3C/3G/3H' },
    { id: 'R32-5', home: '1B', away: '3A/3B/3C' },
    { id: 'R32-6', home: '1D', away: '3D/3E/3F' },
    { id: 'R32-7', home: '1F', away: '3A/3B/3C' },
    { id: 'R32-8', home: '1H', away: '3G/3H/3A' },
    { id: 'R32-9', home: '2A', away: '2B' },
    { id: 'R32-10', home: '2C', away: '2D' },
    { id: 'R32-11', home: '2E', away: '2F' },
    { id: 'R32-12', home: '2G', away: '2H' },
    { id: 'R32-13', home: '1I', away: '3I/3J/3K/3L' },
    { id: 'R32-14', home: '1J', away: '3I/3J/3K/3L' },
    { id: 'R32-15', home: '1K', away: '3K/3L/3I' },
    { id: 'R32-16', home: '1L', away: '3J/3K/3L' },
  ];

  for (const slot of r32Slots) {
    let home: string;
    let away: string;

    // Home slot: could be "1A" (group winner) or a third-place slot
    if (slot.home.includes('3')) {
      home = getThirdPlace(slot.home);
    } else {
      home = resolveTeamSlot(slot.home, qualified, winners, losers);
    }

    // Away slot: could be "2B" (runner-up) or a third-place slot like "3B/3E/3F/3G"
    if (slot.away.includes('3')) {
      away = getThirdPlace(slot.away);
    } else {
      away = resolveTeamSlot(slot.away, qualified, winners, losers);
    }

    const result = await predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
    results.push(result);
    if (result.winner && result.winner !== 'TBD') {
      winners.set(`W-${slot.id}`, result.winner);
    }
  }

  // ═══════════════════════════════════════════════════
  // ROUND OF 16 — 8 matches
  // ═══════════════════════════════════════════════════

  const r16Slots = [
    { id: 'R16-1', home: 'W-R32-1', away: 'W-R32-2' },
    { id: 'R16-2', home: 'W-R32-3', away: 'W-R32-4' },
    { id: 'R16-3', home: 'W-R32-5', away: 'W-R32-6' },
    { id: 'R16-4', home: 'W-R32-7', away: 'W-R32-8' },
    { id: 'R16-5', home: 'W-R32-9', away: 'W-R32-10' },
    { id: 'R16-6', home: 'W-R32-11', away: 'W-R32-12' },
    { id: 'R16-7', home: 'W-R32-13', away: 'W-R32-14' },
    { id: 'R16-8', home: 'W-R32-15', away: 'W-R32-16' },
  ];

  for (const slot of r16Slots) {
    const home = resolveTeamSlot(slot.home, qualified, winners, losers);
    const away = resolveTeamSlot(slot.away, qualified, winners, losers);
    const result = await predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
    results.push(result);
    if (result.winner && result.winner !== 'TBD') {
      winners.set(`W-${slot.id}`, result.winner);
    }
  }

  // ═══════════════════════════════════════════════════
  // QUARTERFINALS — 4 matches
  // ═══════════════════════════════════════════════════

  const qfSlots = [
    { id: 'QF-1', home: 'W-R16-1', away: 'W-R16-2' },
    { id: 'QF-2', home: 'W-R16-3', away: 'W-R16-4' },
    { id: 'QF-3', home: 'W-R16-5', away: 'W-R16-6' },
    { id: 'QF-4', home: 'W-R16-7', away: 'W-R16-8' },
  ];

  for (const slot of qfSlots) {
    const home = resolveTeamSlot(slot.home, qualified, winners, losers);
    const away = resolveTeamSlot(slot.away, qualified, winners, losers);
    const result = await predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
    results.push(result);
    if (result.winner && result.winner !== 'TBD') {
      winners.set(`W-${slot.id}`, result.winner);
    }
  }

  // ═══════════════════════════════════════════════════
  // SEMIFINALS — 2 matches
  // ═══════════════════════════════════════════════════

  const sfSlots = [
    { id: 'SF-1', home: 'W-QF-1', away: 'W-QF-2' },
    { id: 'SF-2', home: 'W-QF-3', away: 'W-QF-4' },
  ];

  for (const slot of sfSlots) {
    const home = resolveTeamSlot(slot.home, qualified, winners, losers);
    const away = resolveTeamSlot(slot.away, qualified, winners, losers);
    const result = await predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
    results.push(result);
    if (result.winner && result.winner !== 'TBD') {
      winners.set(`W-${slot.id}`, result.winner);
      const loser = result.winner === result.homeTeam ? result.awayTeam : result.homeTeam;
      losers.set(`L-${slot.id}`, loser);
    }
  }

  // ═══════════════════════════════════════════════════
  // THIRD PLACE — 1 match (losers of SF)
  // ═══════════════════════════════════════════════════

  const sf1Loser = losers.get('L-SF-1');
  const sf2Loser = losers.get('L-SF-2');

  if (sf1Loser && sf2Loser && sf1Loser !== 'TBD' && sf2Loser !== 'TBD') {
    const thirdResult = await predictSingleMatch(sf1Loser, sf2Loser, '3rd', getTeamFormCached, useEnhanced);
    results.push(thirdResult);
  }

  // ═══════════════════════════════════════════════════
  // FINAL — 1 match
  // ═══════════════════════════════════════════════════

  const sf1Winner = winners.get('W-SF-1');
  const sf2Winner = winners.get('W-SF-2');

  if (sf1Winner && sf2Winner && sf1Winner !== 'TBD' && sf2Winner !== 'TBD') {
    const finalResult = await predictSingleMatch(sf1Winner, sf2Winner, 'Final', getTeamFormCached, useEnhanced);
    results.push(finalResult);
  }

  return results;
}
