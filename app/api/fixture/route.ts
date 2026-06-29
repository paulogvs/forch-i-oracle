// FORCH.i ORACLE — API Route: Full Tournament Fixture Prediction (v3 Ensemble Engine)
// Predicts ALL 128 matches using the 4-model ensemble for maximum accuracy.
// Response is cached for 5 minutes to avoid redundant recomputation.
// Autonomous: fetches fresh results and updates team forms on every request.
import { NextRequest, NextResponse } from 'next/server';
import { ALL_MATCHES, MATCHES_BY_GROUP } from '@/lib/matches';
import { checkRateLimit } from '@/lib/rate-limit';
import { calculateStatisticalPrediction } from '@/lib/predictor-engine';
import { predictMatchDynamic, addMatchResult, getResultsCount, seedFromResults } from '@/lib/prediction-store';
import { calculateEnhancedPrediction, type EnhancedPredictionContext } from '@/lib/enhanced-engine';
import { calculateEnsemblePrediction, addCalibrationResult } from '@/lib/ensemble-engine';
import { getDataLayerAsync } from '@/lib/data-layer';
import { getOrComputeTournamentResults } from '@/lib/tournament-results';
import { buildTournamentDAG } from '@/lib/tournament-dag';
import { fetchWC26Games, teamIdToSpanish, type WC26Game } from '@/lib/worldcup26-api';
import { mapFDNameToSpanish } from '@/lib/teams';

// ═══ RESPONSE CACHE (5 minutes) ═══
interface FixtureCacheEntry { data: unknown; expiresAt: number; }
const fixtureCache = new Map<string, FixtureCacheEntry>();
const FIXTURE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getFixtureCache(key: string): unknown | null {
  const entry = fixtureCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { fixtureCache.delete(key); return null; }
  return entry.data;
}

function setFixtureCache(key: string, data: unknown): void {
  fixtureCache.set(key, { data, expiresAt: Date.now() + FIXTURE_CACHE_TTL });
}

// ═══ KNOCKOUT SLOT RESOLVER ═══
// After group stage results are known, this resolves bracket slot names
// (like "1A", "3B/3E/3F/3G", "W-R32-1") to actual team names in the data layer.
// Called on every ensureResultsFromExternalAPI to keep bracket in sync.
// Handles ALL rounds: R32 → R16 → QF → SF → 3rd → Final.
async function resolveKnockoutTeamNames(db: Awaited<ReturnType<typeof getDataLayerAsync>>): Promise<number> {
  const allResults = await db.getMatchResults();
  if (allResults.length === 0) return 0; // No results yet — can't resolve

  const allMatches = await db.getAllMatches();
  const resultsMap = new Map(allResults.map(r => [r.matchId, r]));

  // ── Check if any knockout match still needs resolution ──
  const slotPattern = /^[12][A-L]$|^3[A-L]|\/|^W-|^L-/;
  const knockoutMatches = allMatches.filter(m =>
    m.round === 'R32' || m.round === 'R16' || m.round === 'QF' || m.round === 'SF'
  );
  if (knockoutMatches.length === 0) return 0;
  const needsResolve = knockoutMatches.some(m => slotPattern.test(m.homeTeamId));
  if (!needsResolve) {
    // Already resolved — just propagate winners if new results arrived
    const winners = new Map<string, string>();
    for (const m of knockoutMatches.sort((a, b) => a.id.localeCompare(b.id))) {
      const result = resultsMap.get(m.id);
      if (result && result.homeScore != null && result.awayScore != null) {
        if (result.homeScore > result.awayScore) winners.set(`W-${m.id}`, m.homeTeamId);
        else if (result.awayScore > result.homeScore) winners.set(`W-${m.id}`, m.awayTeamId);
      }
    }
    // Propagate winners to later-round matches that use W- slots
    const laterMatches = allMatches.filter(m =>
      m.round === 'R16' || m.round === 'QF' || m.round === 'SF' || m.id === '3rd' || m.id === 'Final'
    );
    let updated = 0;
    for (const m of laterMatches) {
      const newHome = m.homeTeamId.startsWith('W-') ? (winners.get(m.homeTeamId) || m.homeTeamId) : m.homeTeamId;
      const newAway = m.awayTeamId.startsWith('W-') ? (winners.get(m.awayTeamId) || m.awayTeamId) : m.awayTeamId;
      if (newHome !== m.homeTeamId || newAway !== m.awayTeamId) {
        await db.updateMatch(m.id, { homeTeamId: newHome, awayTeamId: newAway });
        updated++;
      }
    }
    return updated;
  }

  // ── Build group standings from real results ──
  const allGroups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const groupStandings: Record<string, any[]> = {};

  for (const groupChar of allGroups) {
    const groupMatches = allMatches.filter(m => m.groupChar === groupChar && m.round === 'group');
    if (groupMatches.length === 0) continue;

    const teamStats = new Map<string, { pts: number; gf: number; ga: number; gd: number; played: number }>();

    for (const match of groupMatches) {
      const result = resultsMap.get(match.id);
      if (!result || result.homeScore == null) continue;

      if (!teamStats.has(match.homeTeamId)) teamStats.set(match.homeTeamId, { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 });
      if (!teamStats.has(match.awayTeamId)) teamStats.set(match.awayTeamId, { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 });

      const home = teamStats.get(match.homeTeamId)!;
      const away = teamStats.get(match.awayTeamId)!;

      home.gf += result.homeScore; home.ga += result.awayScore; home.played++;
      away.gf += result.awayScore; away.ga += result.homeScore; away.played++;

      if (result.homeScore > result.awayScore) { home.pts += 3; }
      else if (result.awayScore > result.homeScore) { away.pts += 3; }
      else { home.pts += 1; away.pts += 1; }
    }

    // FIFA sort: pts → gd → gf
    const standings = Array.from(teamStats.entries())
      .map(([name, s]) => ({ name, pts: s.pts, gf: s.gf, ga: s.ga, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    groupStandings[groupChar] = standings;
  }

  // ── Resolve qualified teams ──
  const qualified = resolveGroupQualifiers(groupStandings);

  // ── Resolve ALL bracket rounds in order ──
  const winners = new Map<string, string>();
  const losers = new Map<string, string>();

  // Third-place unique assignment (same logic as simulateKnockoutPhase)
  const usedThirdPlaces = new Set<string>();
  const getThirdPlace = (slot: string): string => {
    const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    for (const tp of qualified.bestThirdPlaces) {
      const tpInfo = qualified.thirdPlaceGroups.find(t => t.name === tp);
      if (tpInfo && groupLetters.includes(tpInfo.group) && !usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    for (const tp of qualified.bestThirdPlaces) {
      if (!usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    return 'TBD';
  };

  // Process rounds in order
  const roundOrder = ['R32', 'R16', 'QF', 'SF', 'F'];
  let totalUpdated = 0;

  for (const round of roundOrder) {
    const roundMatches = allMatches.filter(m => m.round === round)
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const match of roundMatches) {
      let homeTeam = match.homeTeamId;
      let awayTeam = match.awayTeamId;

      // Resolve slot names
      if (slotPattern.test(homeTeam)) {
        if (homeTeam.includes('3')) {
          homeTeam = getThirdPlace(homeTeam);
        } else {
          homeTeam = resolveTeamSlot(homeTeam, qualified, winners, losers);
        }
      }
      if (slotPattern.test(awayTeam)) {
        if (awayTeam.includes('3')) {
          awayTeam = getThirdPlace(awayTeam);
        } else {
          awayTeam = resolveTeamSlot(awayTeam, qualified, winners, losers);
        }
      }

      // Skip if both are still TBD
      if (homeTeam === 'TBD' && awayTeam === 'TBD' && match.homeTeamId === homeTeam && match.awayTeamId === awayTeam) continue;

      // Update match in data layer
      if (homeTeam !== match.homeTeamId || awayTeam !== match.awayTeamId) {
        await db.updateMatch(match.id, { homeTeamId: homeTeam, awayTeamId: awayTeam });
        totalUpdated++;
      }

      // Propagate winners from existing results
      if (homeTeam !== 'TBD' && awayTeam !== 'TBD') {
        const result = resultsMap.get(match.id);
        if (result && result.homeScore != null && result.awayScore != null) {
          if (result.homeScore > result.awayScore) {
            winners.set(`W-${match.id}`, homeTeam);
          } else if (result.awayScore > result.homeScore) {
            winners.set(`W-${match.id}`, awayTeam);
          } else {
            // Draw in knockout → penalties. Home wins penalty shootout by convention.
            winners.set(`W-${match.id}`, homeTeam);
            losers.set(`L-${match.id}`, awayTeam);
          }
        }
      }
    }
  }

  // Handle 3rd place match separately
  const thirdMatch = allMatches.find(m => m.id === '3rd');
  if (thirdMatch) {
    const h = resolveTeamSlot(thirdMatch.homeTeamId, qualified, winners, losers);
    const a = resolveTeamSlot(thirdMatch.awayTeamId, qualified, winners, losers);
    if (h !== thirdMatch.homeTeamId || a !== thirdMatch.awayTeamId) {
      await db.updateMatch('3rd', { homeTeamId: h, awayTeamId: a });
      totalUpdated++;
    }
  }

  if (totalUpdated > 0) {
    console.log(`[fixture] resolveKnockoutTeamNames: ${totalUpdated} matches updated`);
  }

  return totalUpdated;
}

// ═══ COLD START: Fetch fresh results from external APIs ═══
// On Vercel, /tmp is ephemeral — data layer loses results on cold start.
// This function re-fetches results from external APIs and ingests them.
// Also updates team forms so the app works autonomously without cron jobs.
// Sources: 1) openfootball (free, frequently updated) → 2) football-data.org (free tier)
//
// TWO-PASS INGESTION (fixes knockout bracket not resolving):
//   Pass 1: Ingest GROUP matches first (team names match static data)
//   Resolve: resolveKnockoutTeamNames() → bracket gets real team names from group results
//   Pass 2: Ingest KNOCKOUT matches (getMatchByTeams now works because bracket has real names)
async function ensureResultsFromExternalAPI(db: Awaited<ReturnType<typeof getDataLayerAsync>>): Promise<{ ingested: number; throttled: boolean; fetchOk: boolean; gamesCount: number; groupMatches: number; koMatches: number; failedIngest: string[] }> {
  // Throttle: only poll external APIs every POLL_INTERVAL_MS
  const shouldPoll = await shouldPollExternalAPIs(db);
  if (!shouldPoll) return { ingested: 0, throttled: true, fetchOk: false, gamesCount: 0, groupMatches: 0, koMatches: 0, failedIngest: [] };

  const existingResults = await db.getMatchResults();
  const existingIds = new Set(existingResults.map(r => r.matchId));
  // Also track which existing results have valid (non-null) scores
  const validScoreIds = new Set(
    existingResults.filter(r => r.homeScore != null && r.awayScore != null).map(r => r.matchId)
  );
  let ingested = 0;
  const failedIngest: string[] = [];

  // ── Helper: ingest a single finished match ──
  async function tryIngest(homeTeam: string, awayTeam: string, homeGoals: number, awayGoals: number): Promise<boolean> {
    let match = await db.getMatchByTeams(homeTeam, awayTeam);
    if (!match) match = await db.getMatchByTeams(awayTeam, homeTeam);
    if (!match) { failedIngest.push(`${homeTeam} vs ${awayTeam} (no match found)`); return false; }
    if (existingIds.has(match.id) && validScoreIds.has(match.id)) return true;
    const winner = homeGoals > awayGoals ? homeTeam : awayGoals > homeGoals ? awayTeam : 'draw';
    await db.submitMatchResult({ matchId: match.id, homeScore: homeGoals, awayScore: awayGoals, winner });
    await updateTeamFormAfterResult(db, homeTeam, awayTeam, homeGoals, awayGoals);
    ingested++;
    existingIds.add(match.id);
    existingResults.push({ matchId: match.id, homeScore: homeGoals, awayScore: awayGoals, winner });
    return true;
  }

  // ── Convert raw games to usable match data ──
  interface MatchData { home: string; away: string; homeGoals: number; awayGoals: number; isGroup: boolean; }
  function extractFinished(games: WC26Game[]): MatchData[] {
    const out: MatchData[] = [];
    for (const g of games) {
      if (g.finished !== 'TRUE') continue;
      const home = teamIdToSpanish(g.home_team_id);
      const away = teamIdToSpanish(g.away_team_id);
      if (!home || !away) continue;
      out.push({
        home, away,
        homeGoals: parseInt(g.home_score) || 0,
        awayGoals: parseInt(g.away_score) || 0,
        isGroup: g.round_of === 'group',
      });
    }
    return out;
  }

  // ── Source 1: openfootball (primary, free) ──
  const games = await fetchWC26Games();
  let gamesCount = 0;
  let groupMatchesCount = 0;
  let koMatchesCount = 0;
  if (games && games.length > 0) {
    gamesCount = games.length;
    const allMatches = extractFinished(games);
    const groupMatches = allMatches.filter(m => m.isGroup);
    const koMatches = allMatches.filter(m => !m.isGroup);
    groupMatchesCount = groupMatches.length;
    koMatchesCount = koMatches.length;

    // PASS 1: Ingest group matches (team names match static data directly)
    for (const m of groupMatches) {
      await tryIngest(m.home, m.away, m.homeGoals, m.awayGoals);
    }

    // RESOLVE: Now that group results are in, resolve bracket slots → real team names
    await resolveKnockoutTeamNames(db);

    // PASS 2: Ingest knockout matches (getMatchByTeams finds them via resolved bracket)
    for (const m of koMatches) {
      await tryIngest(m.home, m.away, m.homeGoals, m.awayGoals);
    }
  }

  // ── Source 2: football-data.org (fallback, free tier) ──
  // Always try as fallback — catches results openfootball hasn't updated yet
  // or when file store lost data on Vercel cold start
  // Note: bracket was already resolved above, so group AND KO matches are findable
  {
    try {
      const fdToken = process.env.FOOTBALL_DATA_ORG_TOKEN;
      const headers: Record<string, string> = {};
      if (fdToken) headers['X-Auth-Token'] = fdToken;

      const fdResp = await fetch('https://api.football-data.org/v4/competitions/WC/matches?status=FINISHED', {
        headers,
        signal: AbortSignal.timeout(15000),
      });

      if (fdResp.ok) {
        const fdData = await fdResp.json();
        const fdMatches = fdData.matches || [];

        for (const fd of fdMatches) {
          const homeTeam = mapFDNameToSpanish(fd.homeTeam.name);
          const awayTeam = mapFDNameToSpanish(fd.awayTeam.name);
          if (!homeTeam || !awayTeam) continue;

          const homeGoals = fd.score.fullTime.homeTeam;
          const awayGoals = fd.score.fullTime.awayTeam;
          if (homeGoals === null || awayGoals === null) continue;

          await tryIngest(homeTeam, awayTeam, homeGoals, awayGoals);
        }
      }
    } catch (err) {
      console.warn('[fixture] football-data.org fallback failed:', err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`[fixture] ensureResults: +${ingested} new / ${existingIds.size} total`);
  if (ingested > 0) {
    // Log first few ingested match IDs for debugging
    const newIds = Array.from(existingIds).slice(-ingested);
    console.log(`[fixture] New match IDs: [${newIds.slice(0, 5).join(', ')}${newIds.length > 5 ? ', ...' : ''}]`);
  }

  // Mark poll time even if nothing new was ingested (avoids redundant calls)
  await markPolled(db);

  return { ingested, throttled: false, fetchOk: true, gamesCount, groupMatches: groupMatchesCount, koMatches: koMatchesCount, failedIngest: failedIngest.slice(0, 5) };
}

// ═══ UPDATE TEAM FORMS after each result ingestion ═══
// Keeps last-5 form, momentum, xG, and dynamic Elo in sync
// without relying on cron jobs.
async function updateTeamFormAfterResult(
  db: Awaited<ReturnType<typeof getDataLayerAsync>>,
  homeTeam: string,
  awayTeam: string,
  homeGoals: number,
  awayGoals: number
) {
  const now = new Date().toISOString().split('T')[0];

  for (const [team, goalsFor, goalsAgainst] of [
    [homeTeam, homeGoals, awayGoals],
    [awayTeam, awayGoals, homeGoals],
  ] as [string, number, number][]) {
    const existingForm = await db.getTeamForm(team);
    const result = goalsFor > goalsAgainst ? 'W' as const : goalsFor < goalsAgainst ? 'L' as const : 'D' as const;

    const last5 = [
      ...(existingForm?.last5 || []),
      {
        result,
        opponent: team === homeTeam ? awayTeam : homeTeam,
        goalsFor,
        goalsAgainst,
        date: now,
        competition: 'World Cup',
      },
    ].slice(-5);

    const avgXG = goalsFor > 0 ? goalsFor : 0.8;
    const momentum = last5.reduce((sum, m, i) => {
      const weight = (i + 1) / last5.length;
      return sum + (m.result === 'W' ? weight : m.result === 'L' ? -weight : 0);
    }, 0) / last5.length;

    const existingElo = (await db.getTeam(team))?.eloRating || 1500;

    await db.saveTeamForm({
      teamId: team,
      last5,
      xgFor: avgXG,
      xgAgainst: goalsAgainst,
      momentum,
      matchesPlayed: (existingForm?.matchesPlayed || 0) + 1,
      eloDynamic: existingElo + (momentum * 20),
    });
  }
}

// ═══ LAST POLL TRACKING — avoid redundant external API calls ═══
// Uses the KV store to track when we last polled external APIs.
// Only re-fetches if more than POLL_INTERVAL_MS has elapsed.
const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes (reduced for testing)

async function shouldPollExternalAPIs(db: Awaited<ReturnType<typeof getDataLayerAsync>>): Promise<boolean> {
  try {
    const lastPoll = await db.getKeyValue('lastExternalPoll');
    if (!lastPoll) return true;
    const elapsed = Date.now() - Number(lastPoll);
    return elapsed > POLL_INTERVAL_MS;
  } catch {
    return true;
  }
}

async function markPolled(db: Awaited<ReturnType<typeof getDataLayerAsync>>): Promise<void> {
  try {
    await db.setKeyValue('lastExternalPoll', String(Date.now()));
  } catch { /* non-critical */ }
}

export async function POST(request: NextRequest) {
  // Rate limit: 20 req/min per IP
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip, 20, 60000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { useDynamic = true, useEnhanced: useEnhancedFlag = true, realResults = [] } = body;

    const db = await getDataLayerAsync();

    // ─── COLD START: Re-fetch results from external API if data layer is empty ───
    // On Vercel, /tmp is ephemeral — results are lost on cold start.
    // This ensures predictions always reflect real results, even after cold start.
    const ingestDebug = await ensureResultsFromExternalAPI(db);

    const storedResults = await db.getMatchResults();
    // Build a map of matchId → actual scores for inclusion in the response
    const actualResultsMap = new Map<string, { homeScore: number; awayScore: number }>();
    for (const r of storedResults) {
      actualResultsMap.set(r.matchId, { homeScore: r.homeScore, awayScore: r.awayScore });
    }
    const resultsHash = storedResults
      .map((r: any) => `${r.matchId}:${r.homeScore}-${r.awayScore}`)
      .join('|');

    // Check cache (skip if real results submitted)
    const cacheKey = `fixture-${useEnhancedFlag}-${useDynamic}`;
    if (realResults.length === 0) {
      const cached = getFixtureCache(cacheKey) as any;
      if (cached && cached.resultsHash === resultsHash) {
        return NextResponse.json(cached);
      }
    }

    // ─── Seed Bayesian engine with stored results on cold start ───
    // On Vercel serverless, in-memory state resets each invocation.
    // Seed from persisted results so predictions reflect real data immediately.
    if (storedResults.length > 0 && getResultsCount() < storedResults.length) {
      const ALL_MATCHES_STATIC = ALL_MATCHES;
      seedFromResults(storedResults.map(r => {
        // matchId format: "Argentina_vs_Canada" or just an ID
        const match = ALL_MATCHES_STATIC.find(m => m.id === r.matchId);
        const parts = r.matchId.includes('_vs_') ? r.matchId.split('_vs_') : [];
        return {
          homeTeam: match?.homeTeam || parts[0] || '',
          awayTeam: match?.awayTeam || parts[1] || '',
          homeScore: r.homeScore ?? 0,
          awayScore: r.awayScore ?? 0,
        };
      }));
    }

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

    // Load existing predictions from DB in one go to avoid N+1
    const allMatchIds = ALL_MATCHES.map(m => m.id);
    const dbPredictions = await db.getPredictionsForMatches(allMatchIds);
    const dbPredictionsMap = new Map(dbPredictions.map(p => [p.matchId, p]));

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
        const existingPred = dbPredictionsMap.get(match.id);

        // Optimization: if we already have a prediction in DB and it's fresh (same resultsHash), use it
        if (existingPred && !realResults.length) {
          prediction = {
            homeWin: existingPred.homeWin,
            draw: existingPred.draw,
            awayWin: existingPred.awayWin,
            homeGoals: parseInt(existingPred.mostLikelyScore?.split('-')[0] || '0'),
            awayGoals: parseInt(existingPred.mostLikelyScore?.split('-')[1] || '0'),
            confidence: existingPred.confidence,
            homeXG: existingPred.expectedGoalsHome,
            awayXG: existingPred.expectedGoalsAway,
            dataQuality: existingPred.dataQualityScore,
          };
        } else if (useEnhancedFlag) {
          // Use ensemble engine (4-model blend for maximum accuracy)
          const ensemble = calculateEnsemblePrediction(match.homeTeam, match.awayTeam);
          prediction = {
            homeWin: ensemble.homeWin,
            draw: ensemble.draw,
            awayWin: ensemble.awayWin,
            homeGoals: ensemble.predictedScoreHome,
            awayGoals: ensemble.predictedScoreAway,
            confidence: ensemble.confidence,
            homeXG: ensemble.homeExpectedGoals,
            awayXG: ensemble.awayExpectedGoals,
            dataQuality: Math.round(ensemble.agreement.agreementScore * 100),
            // Ensemble-specific fields
            agreement: ensemble.agreement,
            uncertainty: ensemble.uncertainty,
            confidenceScore: ensemble.confidenceScore,
            keyFactors: ensemble.keyFactors,
            weights: ensemble.weights,
          };

          // Save prediction to data layer
          try {
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
              keyFactors: ensemble.keyFactors,
              confidence: ensemble.confidence,
              dataQualityScore: Math.round(ensemble.agreement.agreementScore * 100),
              modelVersion: '3.0-ensemble',
              homeAttack: ensemble.models.eloPoisson.homeAttack,
              homeDefense: ensemble.models.eloPoisson.homeDefense,
              homeMidfield: ensemble.models.eloPoisson.homeMidfield,
              awayAttack: ensemble.models.eloPoisson.awayAttack,
              awayDefense: ensemble.models.eloPoisson.awayDefense,
              awayMidfield: ensemble.models.eloPoisson.awayMidfield,
              homeElo: ensemble.models.eloPoisson.homeElo,
              awayElo: ensemble.models.eloPoisson.awayElo,
              topScores: ensemble.topScores,
              // Model disagreement data (already computed by ensemble)
              agreement: ensemble.agreement,
              uncertainty: ensemble.uncertainty,
              confidenceScore: ensemble.confidenceScore,
              models: {
                dixonColes: { homeWin: ensemble.models.dixonColes.homeWin, draw: ensemble.models.dixonColes.draw, awayWin: ensemble.models.dixonColes.awayWin },
                eloPoisson: { homeWin: ensemble.models.eloPoisson.homeWin, draw: ensemble.models.eloPoisson.draw, awayWin: ensemble.models.eloPoisson.awayWin },
                bayesian: { homeWin: ensemble.models.dynamic.homeWinPct, draw: ensemble.models.dynamic.drawPct, awayWin: ensemble.models.dynamic.awayWinPct },
                purePoisson: ensemble.models.purePoisson,
              },
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
          const stat = calculateStatisticalPrediction(match.homeTeam, match.awayTeam);
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

        const actual = actualResultsMap.get(match.id);
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
          actualScore: actual ? [actual.homeScore, actual.awayScore] : null,
          confidence: prediction.confidence,
          homeWinPct: prediction.homeWin,
          drawPct: prediction.draw,
          awayWinPct: prediction.awayWin,
          xG: [prediction.homeXG, prediction.awayXG],
          dataQuality: prediction.dataQuality,
          // Model disagreement data
          agreement: prediction.agreement || null,
          uncertainty: prediction.uncertainty || null,
          confidenceScore: prediction.confidenceScore || null,
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
    // PHASE 2: Knockout Stage from the Consensus Bracket (Single Source of Truth)
    // ═══════════════════════════════════════════════════
    const knockoutMatches = ALL_MATCHES.filter(m => m.round !== 'group');

    // Retrieve consensus bracket (it auto-calculates and heals if out-of-sync in getOrComputeTournamentResults)
    const tournamentData = await getOrComputeTournamentResults();
    const bracket = tournamentData.bracket;

    // Debug: bracket resolution status (visible in browser console)
    const r32 = bracket?.roundOf32 || [];
    const resolved = r32.filter((m: any) => m.homeTeam !== 'TBD' && m.awayTeam !== 'TBD').length;
    const total = r32.length;
    const ingestedCount = storedResults.length;
    const debugInfo: any = {
      bracketResolved: `${resolved}/${total}`,
      storedResults: ingestedCount,
      pollInterval: '2 min (testing)',
      ingest: ingestDebug,
    };
    if (total > 0 && resolved < total) {
      const firstTbd = r32.find((m: any) => m.homeTeam === 'TBD' || m.awayTeam === 'TBD');
      if (firstTbd) {
        debugInfo.firstTbd = { id: firstTbd.id, home: firstTbd.homeTeam, away: firstTbd.awayTeam };
      }
    }
    console.log(`[fixture] Bracket status: ${resolved}/${total} R32 matches resolved, ${ingestedCount} real results ingested`);

    const knockoutMap = new Map<string, any>();
    if (bracket) {
      const allBracketMatches = [
        ...(bracket.roundOf32 || []),
        ...(bracket.roundOf16 || []),
        ...(bracket.quarters || []),
        ...(bracket.semis || []),
        bracket.thirdPlace,
        bracket.final,
      ].filter(Boolean);

      for (const bm of allBracketMatches) {
        // Map TP-1 to 3rd and FINAL to Final for matching matching ID
        const id = bm.id === 'TP-1' ? '3rd' : bm.id === 'FINAL' ? 'Final' : bm.id;
        knockoutMap.set(id, bm);
      }
    }

    for (const match of knockoutMatches) {
      const koResult = knockoutMap.get(match.id);
      const homeGoals = koResult ? koResult.homeScore : null;
      const awayGoals = koResult ? koResult.awayScore : null;

      const koActual = actualResultsMap.get(match.id);
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
        predictedScore: koResult && koResult.homeTeam !== 'TBD' && homeGoals !== null ? [homeGoals, awayGoals] : null,
        actualScore: koActual ? [koActual.homeScore, koActual.awayScore] : null,
        confidence: koResult && koResult.homeWinProb != null ? (koResult.homeWinProb > 55 ? 'alta' : koResult.homeWinProb > 40 ? 'media' : 'baja') : null,
        homeWinPct: koResult ? koResult.homeWinProb : null,
        drawPct: koResult ? koResult.drawProb : null,
        awayWinPct: koResult ? koResult.awayWinProb : null,
        xG: koResult && koResult.xGHome != null && koResult.xGAway != null ? [koResult.xGHome, koResult.xGAway] : null,
        // Knockout model disagreement data
        agreement: koResult?.agreement || null,
        uncertainty: koResult?.uncertainty || null,
        confidenceScore: koResult?.confidenceScore || null,
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

    // ═══ TOURNAMENT DAG — Bracket dependency structure ═══
    const dag = buildTournamentDAG();

    const response = {
      success: true,
      fixture,
      groupStandings,
      totalMatches: fixture.length,
      groupStageMatches: 72,
      knockoutMatches: fixture.length - 72,
      useDynamic,
      useEnhanced: useEnhancedFlag,
      realResultsIngested: realResults.length,
      totalRealResults: storedResults.length,
      resultsHash,
      // Tournament DAG (bracket structure)
      bracketDAG: {
        nodes: dag.nodes.map(n => ({
          matchId: n.matchId,
          round: n.round,
          roundLabel: n.roundLabel,
          feedsInto: n.feedsInto,
          feedsIntoSlot: n.feedsIntoSlot,
          feedsFrom: n.feedsFrom,
        })),
        depth: dag.depth,
      },
      // Debug info (visible in browser console)
      debugInfo,
    };

    // Cache the response (skip if real results were submitted)
    if (realResults.length === 0) {
      setFixtureCache(cacheKey, response);
    }

    return NextResponse.json(response);

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

function predictSingleMatch(
  homeTeam: string,
  awayTeam: string,
  matchId: string,
  _getTeamFormCached: (name: string) => Promise<any>,
  useEnhanced: boolean
): any {
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
    // Use ensemble engine for knockout matches too
    const ensemble = calculateEnsemblePrediction(homeTeam, awayTeam);
    prediction = {
      homeWin: ensemble.homeWin,
      draw: ensemble.draw,
      awayWin: ensemble.awayWin,
      homeGoals: ensemble.predictedScoreHome,
      awayGoals: ensemble.predictedScoreAway,
      confidence: ensemble.confidence,
      homeXG: ensemble.homeExpectedGoals,
      awayXG: ensemble.awayExpectedGoals,
      agreement: ensemble.agreement,
      uncertainty: ensemble.uncertainty,
      confidenceScore: ensemble.confidenceScore,
    };
  } else {
    const stat = calculateStatisticalPrediction(homeTeam, awayTeam);
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

function simulateKnockoutPhase(
  qualified: QualifiedTeams,
  getTeamFormCached: (name: string) => Promise<any>,
  useEnhanced: boolean
): any[] {
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

    const result = predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
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
    const result = predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
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
    const result = predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
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
    const result = predictSingleMatch(home, away, slot.id, getTeamFormCached, useEnhanced);
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
    const thirdResult = predictSingleMatch(sf1Loser, sf2Loser, '3rd', getTeamFormCached, useEnhanced);
    results.push(thirdResult);
  }

  // ═══════════════════════════════════════════════════
  // FINAL — 1 match
  // ═══════════════════════════════════════════════════

  const sf1Winner = winners.get('W-SF-1');
  const sf2Winner = winners.get('W-SF-2');

  if (sf1Winner && sf2Winner && sf1Winner !== 'TBD' && sf2Winner !== 'TBD') {
    const finalResult = predictSingleMatch(sf1Winner, sf2Winner, 'Final', getTeamFormCached, useEnhanced);
    results.push(finalResult);
  }

  return results;
}
