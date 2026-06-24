// FORCH.i ORACLE — Cron Job: Data Ingestion
// GitHub Actions cron job that ingests match results and updates data layer.
// Schedule: Every 6 hours
// Trigger: GET /api/cron/ingest
//
// AUTO-RECALCULATE: After ingesting real results, triggers full re-simulation
// of remaining bracket with updated predictions and drift tracking.
//
// DATA SOURCES (in order of priority):
// 1. wheniskickoff.com — Free, no API key, static JSON (PRIMARY)
// 2. openfootball/worldcup.json — Free GitHub CDN, no API key (FALLBACK)
// 3. API-Football (v3) — requires paid plan for 2026 season (secondary fallback)
// 4. football-data.org (v4) — free tier includes World Cup (tertiary fallback)
// 5. Manual submission via /api/match-result

import { NextResponse } from 'next/server';
import { getDataLayerAsync, type IDataLayer } from '@/lib/data-layer';
import { WORLD_CUP_TEAMS } from '@/lib/teams';
import { validateCronAuth } from '@/lib/cron-auth';
import { fetchWC26Games, teamIdToSpanish, teamEnglishToSpanish, type WC26Game } from '@/lib/worldcup26-api';
// Note: data sources are wheniskickoff.com (primary) + openfootball (fallback)

const getApiKey = () => process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

// football-data.org configuration
const FD_BASE_URL = 'https://api.football-data.org/v4';
const FD_WC_COMPETITION = 'WC'; // World Cup competition code

// Parse scorers string from worldcup26.ir
function parseWC26Scorers(scorersStr: string): string[] {
  if (!scorersStr || scorersStr === '{}' || scorersStr === '[]') return [];
  try {
    const cleaned = scorersStr.replace(/^{/, '[').replace(/}$/, ']');
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return scorersStr.split(',').map(s => s.trim()).filter(Boolean);
  }
}

interface DiagnosticLog {
  step: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  details?: unknown;
}

async function apiFetch(endpoint: string, diagnostics: DiagnosticLog[]): Promise<Record<string, unknown> | null> {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    diagnostics.push({
      step: 'api_key',
      status: 'error',
      message: 'FOOTBALL_API_KEY environment variable is not set',
      details: { hint: 'Add FOOTBALL_API_KEY to Vercel Environment Variables (https://www.api-football.com/)' },
    });
    return null;
  }

  try {
    const url = `${BASE_URL}${endpoint}`;
    diagnostics.push({ step: 'api_request', status: 'ok', message: `Fetching: ${url}` });

    const response = await fetch(url, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unable to read');
      diagnostics.push({
        step: 'api_response',
        status: 'error',
        message: `API returned HTTP ${response.status}`,
        details: { status: response.status, body: body.slice(0, 500) },
      });
      return null;
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
      diagnostics.push({
        step: 'api_errors',
        status: 'error',
        message: 'API-Football returned errors',
        details: data.errors,
      });
      return null;
    }

    const fixtureCount = data.response?.length ?? 0;
    diagnostics.push({
      step: 'api_success',
      status: 'ok',
      message: `Received ${fixtureCount} fixtures from API-Football`,
      details: {
        resultsAvailable: data.results?.available,
        paging: data.paging,
      },
    });

    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push({
      step: 'api_exception',
      status: 'error',
      message: `API request failed: ${msg}`,
    });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// FOOTBALL-DATA.ORG API (fallback when API-Football fails)
// Free tier: 10 requests/minute, includes World Cup
// ═══════════════════════════════════════════════════════════════

interface FDMatch {
  id: number;
  utcDate: string;
  status: string; // 'SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED', etc.
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: { id: number; name: string; tla: string | null };
  awayTeam: { id: number; name: string; tla: string | null };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { homeTeam: number | null; awayTeam: number | null };
    halfTime: { homeTeam: number | null; awayTeam: number | null };
  };
}

async function fetchFootballDataOrg(diagnostics: DiagnosticLog[]): Promise<FDMatch[] | null> {
  try {
    // football-data.org free tier doesn't require auth for basic endpoints
    // But auth gives higher rate limits
    const headers: Record<string, string> = {};
    const fdToken = process.env.FOOTBALL_DATA_ORG_TOKEN;
    if (fdToken) {
      headers['X-Auth-Token'] = fdToken;
    }

    const url = `${FD_BASE_URL}/competitions/${FD_WC_COMPETITION}/matches?status=FINISHED`;
    diagnostics.push({
      step: 'fd_request',
      status: 'ok',
      message: `Fetching finished WC matches from football-data.org: ${url}`,
    });

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => 'unable to read');
      diagnostics.push({
        step: 'fd_response',
        status: 'error',
        message: `football-data.org returned HTTP ${response.status}`,
        details: { status: response.status, body: body.slice(0, 500) },
      });
      return null;
    }

    const data = await response.json();
    const matches = data.matches || [];

    diagnostics.push({
      step: 'fd_success',
      status: 'ok',
      message: `Received ${matches.length} finished WC matches from football-data.org`,
    });

    return matches;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    diagnostics.push({
      step: 'fd_exception',
      status: 'error',
      message: `football-data.org request failed: ${msg}`,
    });
    return null;
  }
}

// Map football-data.org team names to our Spanish names
function mapFDTeamName(fdName: string): string | null {
  // Direct lookup in our team data
  const team = WORLD_CUP_TEAMS.find(
    t => t.englishName.toLowerCase() === fdName.toLowerCase() ||
         t.name.toLowerCase() === fdName.toLowerCase() ||
         t.code.toLowerCase() === fdName.toLowerCase()
  );
  if (team) return team.name;

  // Common football-data.org name variations
  const FD_NAME_MAP: Record<string, string> = {
    'Mexico': 'México',
    'South Africa': 'Sudáfrica',
    'South Korea': 'Corea del Sur',
    'Czech Republic': 'Chequia',
    'Czechia': 'Chequia',
    'United States': 'Estados Unidos',
    'USA': 'Estados Unidos',
    'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
    'Ivory Coast': 'Costa de Marfil',
    "Côte d'Ivoire": 'Costa de Marfil',
    'DR Congo': 'RD Congo',
    'Congo DR': 'RD Congo',
    'Saudi Arabia': 'Arabia Saudita',
    'Iran': 'Irán',
    'Iraq': 'Irak',
    'New Zealand': 'Nueva Zelanda',
    'Netherlands': 'Países Bajos',
    'Tunisia': 'Túnez',
    'Algeria': 'Argelia',
    'Morocco': 'Marruecos',
    'Egypt': 'Egipto',
    'Cape Verde': 'Cabo Verde',
    'Uzbekistan': 'Uzbekistán',
    'Korea Republic': 'Corea del Sur',
    'Korea DR': 'Corea del Sur',
  };

  return FD_NAME_MAP[fdName] || null;
}

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = await getDataLayerAsync();
  const diagnostics: DiagnosticLog[] = [];
  const results = {
    fixturesProcessed: 0,
    resultsIngested: 0,
    formsUpdated: 0,
    nameMappingFailures: [] as string[],
    errors: [] as string[],
  };

  try {
    console.log('[cron:ingest] Starting World Cup data ingestion...');

    // Step 1: Check API key
    const apiKey = getApiKey();
    diagnostics.push({
      step: 'config',
      status: apiKey ? 'ok' : 'error',
      message: apiKey ? 'API key configured' : 'FOOTBALL_API_KEY not set',
    });

    // Step 2: Check data layer connection
    try {
      const teams = await db.getAllTeams();
      diagnostics.push({
        step: 'database',
        status: 'ok',
        message: `Data layer connected. ${teams.length} teams in database.`,
      });
    } catch (err) {
      diagnostics.push({
        step: 'database',
        status: 'error',
        message: `Data layer connection failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }

    // Step 3: Fetch World Cup 2026 fixtures — try wheniskickoff.com FIRST (primary, free, no API key)
    diagnostics.push({
      step: 'source_selection',
      status: 'ok',
      message: 'Data source priority: 1) wheniskickoff.com (free) → 2) openfootball (free) → 3) API-Football → 4) football-data.org',
    });

    const wc26Games = await fetchWC26Games();

    if (wc26Games && wc26Games.length > 0) {
      // Primary source worked — process its games
      diagnostics.push({
        step: 'wc26_success',
        status: 'ok',
        message: `Received ${wc26Games.length} games from wheniskickoff.com/openfootball`,
      });

      results.fixturesProcessed = await processWC26Games(wc26Games, db, results, diagnostics);
    } else {
      // worldcup26.ir failed — try API-Football
      diagnostics.push({
        step: 'fallback_apifootball',
        status: 'warn',
        message: 'wheniskickoff.com/openfootball unavailable. Trying API-Football...',
      });

      const wcData = await apiFetch('/fixtures?league=9&season=2026', diagnostics);

      if (wcData?.response && Array.isArray(wcData.response) && wcData.response.length > 0) {
        results.fixturesProcessed = await processFixtures(wcData.response as any[], db, results, diagnostics);
      } else {
        // API-Football failed — try football-data.org
        diagnostics.push({
          step: 'fallback_fd',
          status: 'warn',
          message: 'API-Football unavailable. Trying football-data.org...',
        });

        const fdMatches = await fetchFootballDataOrg(diagnostics);

        if (fdMatches && fdMatches.length > 0) {
          results.fixturesProcessed = await processFDFixtures(fdMatches, db, results, diagnostics);
        } else {
          // All APIs failed — baseline form data
          diagnostics.push({
            step: 'all_apis_failed',
            status: 'warn',
            message: 'All APIs unavailable. Using baseline data.',
          });

          const teams = await db.getAllTeams();
          for (const team of teams) {
            const existingForm = await db.getTeamForm(team.name);
            if (!existingForm) {
              await db.saveTeamForm({
                teamId: team.name,
                last5: [],
                xgFor: 1.2,
                xgAgainst: 1.0,
                momentum: 0,
                matchesPlayed: 0,
                eloDynamic: team.eloRating,
              });
              results.formsUpdated++;
            }
          }
        }
      }
    }

    // Log summary of what was ingested
    if (results.resultsIngested > 0) {
      diagnostics.push({
        step: 'ingest_summary',
        status: 'ok',
        message: `${results.resultsIngested} results ingested, ${results.formsUpdated} forms updated`,
      });
      console.log(`[cron:ingest] ${results.resultsIngested} new results ingested`);
    }

    // Check for name mapping failures
    if (results.nameMappingFailures.length > 0) {
      diagnostics.push({
        step: 'name_mapping',
        status: 'warn',
        message: `${results.nameMappingFailures.length} API team names could not be mapped`,
        details: results.nameMappingFailures.slice(0, 10),
      });
    }

    const duration = Date.now() - startTime;

    await db.updateCronStatus({
      jobName: 'ingest',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: results.fixturesProcessed,
    });

    console.log(`[cron:ingest] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      fixturesProcessed: results.fixturesProcessed,
      resultsIngested: results.resultsIngested,
      formsUpdated: results.formsUpdated,
      nameMappingFailures: results.nameMappingFailures.length > 0 ? results.nameMappingFailures : undefined,
      errors: results.errors.length > 0 ? results.errors : undefined,
      diagnostics,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:ingest] Fatal error:', msg);

    await db.updateCronStatus({
      jobName: 'ingest',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg, diagnostics }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════
// PROCESS WORLDCUP26.IR GAMES (PRIMARY DATA SOURCE)
// Free, open-source, no API key required
// ═══════════════════════════════════════════════════════════════

async function processWC26Games(
  games: WC26Game[],
  db: IDataLayer,
  results: { resultsIngested: number; formsUpdated: number; nameMappingFailures: string[]; errors: string[] },
  diagnostics: DiagnosticLog[]
): Promise<number> {
  let processed = 0;
  let skippedNotFinished = 0;
  let skippedNoMapping = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyIngested = 0;

  // Get existing results to avoid duplicates
  const existingResults = await db.getMatchResults();
  const existingResultIds = new Set(existingResults.map(r => r.matchId));

  for (const game of games) {
    try {
      // Only process finished matches
      if (game.finished !== 'TRUE') {
        skippedNotFinished++;
        continue;
      }

      const homeGoals = parseInt(game.home_score) || 0;
      const awayGoals = parseInt(game.away_score) || 0;

      // Map team IDs to Spanish names
      const homeTeam = teamIdToSpanish(game.home_team_id);
      const awayTeam = teamIdToSpanish(game.away_team_id);

      if (!homeTeam || !awayTeam) {
        skippedNoMapping++;
        const unmapped = !homeTeam ? `ID:${game.home_team_id} (${game.home_team_name_en})` : `ID:${game.away_team_id} (${game.away_team_name_en})`;
        results.nameMappingFailures.push(unmapped);
        diagnostics.push({
          step: 'wc26_name_mapping',
          status: 'warn',
          message: `WC26 name mapping failed: ${game.home_team_name_en} vs ${game.away_team_name_en} (IDs: ${game.home_team_id}/${game.away_team_id})`,
        });
        continue;
      }

      // Find matching match in our database
      let match = await db.getMatchByTeams(homeTeam, awayTeam);

      // Fallback: try reversed order
      if (!match) {
        match = await db.getMatchByTeams(awayTeam, homeTeam);
      }

      // Fallback: try with English names
      if (!match) {
        const homeEnglish = teamEnglishToSpanish(game.home_team_name_en);
        const awayEnglish = teamEnglishToSpanish(game.away_team_name_en);
        if (homeEnglish && awayEnglish) {
          match = await db.getMatchByTeams(homeEnglish, awayEnglish);
          if (!match) {
            match = await db.getMatchByTeams(awayEnglish, homeEnglish);
          }
        }
      }

      if (!match) {
        skippedNoMatch++;
        diagnostics.push({
          step: 'wc26_match_lookup',
          status: 'warn',
          message: `No match found for: ${homeTeam} vs ${awayTeam} (WC26: ${game.home_team_name_en} vs ${game.away_team_name_en}, group ${game.group})`,
        });
        continue;
      }

      // Check if already ingested
      if (existingResultIds.has(match.id)) {
        skippedAlreadyIngested++;
        continue;
      }

      // Parse scorers
      const homeScorers = parseWC26Scorers(game.home_scorers);
      const awayScorers = parseWC26Scorers(game.away_scorers);

      // Ingest the result
      const winner = homeGoals > awayGoals ? homeTeam : awayGoals > homeGoals ? awayTeam : 'draw';

      await db.submitMatchResult({
        matchId: match.id,
        homeScore: homeGoals,
        awayScore: awayGoals,
        winner,
      });

      // Update team form
      await updateTeamForm(db, homeTeam, awayTeam, homeGoals, awayGoals);
      results.formsUpdated += 2;
      results.resultsIngested++;
      processed++;
      existingResultIds.add(match.id);

      const scorersInfo = homeScorers.length > 0 || awayScorers.length > 0
        ? ` (scorers: ${[...homeScorers, ...awayScorers].join(', ')})`
        : '';

      console.log(`[cron:ingest] WC26 Ingested: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}${scorersInfo}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`WC26 game error: ${msg}`);
    }
  }

  diagnostics.push({
    step: 'wc26_fixture_processing',
    status: 'ok',
    message: `Processed ${games.length} WC26 games: ${processed} ingested, ${skippedAlreadyIngested} already existed, ${skippedNoMatch} no match found, ${skippedNoMapping} name mapping failed, ${skippedNotFinished} not yet finished`,
    details: {
      total: games.length,
      ingested: processed,
      alreadyExisted: skippedAlreadyIngested,
      noMatchFound: skippedNoMatch,
      nameMappingFailed: skippedNoMapping,
      notFinished: skippedNotFinished,
    },
  });

  return processed;
}

async function processFixtures(
  fixtures: any[],
  db: IDataLayer,
  results: { resultsIngested: number; formsUpdated: number; nameMappingFailures: string[]; errors: string[] },
  diagnostics: DiagnosticLog[]
): Promise<number> {
  let processed = 0;
  let skippedNotFinished = 0;
  let skippedNoMapping = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyIngested = 0;

  // Hoist results lookup outside loop (fix N+1)
  const existingResults = await db.getMatchResults();
  const existingResultIds = new Set(existingResults.map(r => r.matchId));

  for (const fixture of fixtures) {
    try {
      const status = fixture.fixture?.status?.short;
      const homeName = fixture.teams?.home?.name;
      const awayName = fixture.teams?.away?.name;
      const homeGoals = fixture.goals?.home;
      const awayGoals = fixture.goals?.away;

      // Only process finished matches with scores
      if (status !== 'FT' || homeGoals === null || awayGoals === null) {
        skippedNotFinished++;
        continue;
      }

      // Map API-Football team names to our Spanish names
      const homeTeam = mapApiNameToSpanish(homeName);
      const awayTeam = mapApiNameToSpanish(awayName);

      if (!homeTeam || !awayTeam) {
        skippedNoMapping++;
        const unmapped = !homeTeam ? homeName : awayName;
        if (unmapped) results.nameMappingFailures.push(unmapped);
        continue;
      }

      // Find matching match in our database
      let match = await db.getMatchByTeams(homeTeam, awayTeam);

      // Fallback: try reversed order (in case home/away are swapped in API)
      if (!match) {
        match = await db.getMatchByTeams(awayTeam, homeTeam);
      }

      // Fallback 2: try with English names
      if (!match) {
        const homeEnglish = mapApiNameToEnglish(homeName);
        const awayEnglish = mapApiNameToEnglish(awayName);
        if (homeEnglish && awayEnglish) {
          match = await db.getMatchByTeams(homeEnglish, awayEnglish);
          if (!match) {
            match = await db.getMatchByTeams(awayEnglish, homeEnglish);
          }
        }
      }

      if (!match) {
        skippedNoMatch++;
        diagnostics.push({
          step: 'match_lookup',
          status: 'warn',
          message: `No match found for: ${homeTeam} vs ${awayTeam} (API: ${homeName} vs ${awayName})`,
        });
        continue;
      }

      // Check if we already have this result
      if (existingResultIds.has(match!.id)) {
        skippedAlreadyIngested++;
        continue;
      }

      // Ingest the result
      const winner = homeGoals > awayGoals ? homeTeam : awayGoals > homeGoals ? awayTeam : 'draw';

      await db.submitMatchResult({
        matchId: match.id,
        homeScore: homeGoals,
        awayScore: awayGoals,
        winner,
      });

      // Update team form
      await updateTeamForm(db, homeTeam, awayTeam, homeGoals, awayGoals);
      results.formsUpdated += 2;
      results.resultsIngested++;
      processed++;

      console.log(`[cron:ingest] Ingested: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`Fixture error: ${msg}`);
    }
  }

  diagnostics.push({
    step: 'fixture_processing',
    status: 'ok',
    message: `Processed ${fixtures.length} fixtures: ${processed} ingested, ${skippedAlreadyIngested} already existed, ${skippedNoMatch} no match found, ${skippedNoMapping} name mapping failed, ${skippedNotFinished} not yet finished`,
    details: {
      total: fixtures.length,
      ingested: processed,
      alreadyExisted: skippedAlreadyIngested,
      noMatchFound: skippedNoMatch,
      nameMappingFailed: skippedNoMapping,
      notFinished: skippedNotFinished,
    },
  });

  return processed;
}

async function updateTeamForm(
  db: IDataLayer,
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

// ═══════════════════════════════════════════════════════════════
// PROCESS FOOTBALL-DATA.ORG FIXTURES
// Converts FD format to our internal format and processes
// ═══════════════════════════════════════════════════════════════

async function processFDFixtures(
  fdMatches: FDMatch[],
  db: IDataLayer,
  results: { resultsIngested: number; formsUpdated: number; nameMappingFailures: string[]; errors: string[] },
  diagnostics: DiagnosticLog[]
): Promise<number> {
  let processed = 0;
  let skippedNotFinished = 0;
  let skippedNoMapping = 0;
  let skippedNoMatch = 0;
  let skippedAlreadyIngested = 0;

  // Get existing results to avoid duplicates
  const existingResults = await db.getMatchResults();
  const existingResultIds = new Set(existingResults.map(r => r.matchId));

  for (const fdMatch of fdMatches) {
    try {
      // Only process finished matches
      if (fdMatch.status !== 'FINISHED') {
        skippedNotFinished++;
        continue;
      }

      const homeGoals = fdMatch.score.fullTime.homeTeam;
      const awayGoals = fdMatch.score.fullTime.awayTeam;

      if (homeGoals === null || awayGoals === null) {
        skippedNotFinished++;
        continue;
      }

      // Map team names
      const homeTeam = mapFDTeamName(fdMatch.homeTeam.name);
      const awayTeam = mapFDTeamName(fdMatch.awayTeam.name);

      if (!homeTeam || !awayTeam) {
        skippedNoMapping++;
        const unmapped = !homeTeam ? fdMatch.homeTeam.name : fdMatch.awayTeam.name;
        if (unmapped) results.nameMappingFailures.push(unmapped);
        diagnostics.push({
          step: 'fd_name_mapping',
          status: 'warn',
          message: `FD name mapping failed: ${fdMatch.homeTeam.name} vs ${fdMatch.awayTeam.name}`,
        });
        continue;
      }

      // Find matching match in our database
      let match = await db.getMatchByTeams(homeTeam, awayTeam);

      // Fallback: try reversed order
      if (!match) {
        match = await db.getMatchByTeams(awayTeam, homeTeam);
      }

      // Fallback: try with English names
      if (!match) {
        const homeEnglish = mapApiNameToEnglish(fdMatch.homeTeam.name);
        const awayEnglish = mapApiNameToEnglish(fdMatch.awayTeam.name);
        if (homeEnglish && awayEnglish) {
          match = await db.getMatchByTeams(homeEnglish, awayEnglish);
          if (!match) {
            match = await db.getMatchByTeams(awayEnglish, homeEnglish);
          }
        }
      }

      if (!match) {
        skippedNoMatch++;
        diagnostics.push({
          step: 'fd_match_lookup',
          status: 'warn',
          message: `No match found for: ${homeTeam} vs ${awayTeam} (FD: ${fdMatch.homeTeam.name} vs ${fdMatch.awayTeam.name})`,
        });
        continue;
      }

      // Check if already ingested
      if (existingResultIds.has(match.id)) {
        skippedAlreadyIngested++;
        continue;
      }

      // Ingest the result
      const winner = homeGoals > awayGoals ? homeTeam : awayGoals > homeGoals ? awayTeam : 'draw';

      await db.submitMatchResult({
        matchId: match.id,
        homeScore: homeGoals,
        awayScore: awayGoals,
        winner,
      });

      // Update team form
      await updateTeamForm(db, homeTeam, awayTeam, homeGoals, awayGoals);
      results.formsUpdated += 2;
      results.resultsIngested++;
      processed++;
      existingResultIds.add(match.id);

      console.log(`[cron:ingest] FD Ingested: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`FD Fixture error: ${msg}`);
    }
  }

  diagnostics.push({
    step: 'fd_fixture_processing',
    status: 'ok',
    message: `Processed ${fdMatches.length} FD fixtures: ${processed} ingested, ${skippedAlreadyIngested} already existed, ${skippedNoMatch} no match found, ${skippedNoMapping} name mapping failed, ${skippedNotFinished} not yet finished`,
    details: {
      total: fdMatches.length,
      ingested: processed,
      alreadyExisted: skippedAlreadyIngested,
      noMatchFound: skippedNoMatch,
      nameMappingFailed: skippedNoMapping,
      notFinished: skippedNotFinished,
    },
  });

  return processed;
}

// Aliases for common API name variations
const NAME_ALIASES: Record<string, string> = {
  'Brazil': 'Brasil',
  'USA': 'Estados Unidos',
  'United States': 'Estados Unidos',
  'Germany': 'Alemania',
  'Spain': 'España',
  'France': 'Francia',
  'England': 'Inglaterra',
  'Portugal': 'Portugal',
  'Netherlands': 'Países Bajos',
  'Morocco': 'Marruecos',
  'Ivory Coast': 'Costa de Marfil',
  'Cote d\'Ivoire': 'Costa de Marfil',
  'DR Congo': 'RD Congo',
  'Czech Republic': 'Chequia',
  'Czechia': 'Chequia',
  'South Korea': 'Corea del Sur',
  'New Zealand': 'Nueva Zelanda',
  'Saudi Arabia': 'Arabia Saudita',
  'South Africa': 'Sudáfrica',
  'Cape Verde': 'Cabo Verde',
  'Curacao': 'Curazao',
  'Uzbekistan': 'Uzbekistán',
  'Tunisia': 'Túnez',
  'Algeria': 'Argelia',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  'Iran': 'Irán',
  'Iraq': 'Irak',
  'Egypt': 'Egipto',
  'Senegal': 'Senegal',
  'Norway': 'Noruega',
  'Croatia': 'Croacia',
  'Switzerland': 'Suiza',
  'Austria': 'Austria',
  'Sweden': 'Suecia',
  'Poland': 'Polonia',
  'Turkey': 'Turquía',
  'Scotland': 'Escocia',
  'Canada': 'Canadá',
  'Mexico': 'México',
  'Argentina': 'Argentina',
  'Uruguay': 'Uruguay',
  'Colombia': 'Colombia',
  'Ecuador': 'Ecuador',
  'Paraguay': 'Paraguay',
  'Chile': 'Chile',
  'Peru': 'Perú',
  'Venezuela': 'Venezuela',
  'Japan': 'Japón',
  'Australia': 'Australia',
  'Qatar': 'Qatar',
  'Jordan': 'Jordania',
  'Ghana': 'Ghana',
  'Nigeria': 'Nigeria',
  'Cameroon': 'Camerún',
  'Panama': 'Panamá',
  'Haiti': 'Haití',
  'Belgium': 'Bélgica',
  'Italy': 'Italia',
  'Denmark': 'Dinamarca',
  'Serbia': 'Serbia',
  'Hungary': 'Hungría',
  'Greece': 'Grecia',
  'Ukraine': 'Ucrania',
  'Ireland': 'Irlanda',
  'Jamaica': 'Jamaica',
  'Costa Rica': 'Costa Rica',
  'Honduras': 'Honduras',
  'Guatemala': 'Guatemala',
  'Bolivia': 'Bolivia',
  'Romania': 'Rumanía',
  'India': 'India',
  'China': 'China',
};

function mapApiNameToSpanish(apiName: string | undefined): string | null {
  if (!apiName) return null;

  // Direct alias lookup
  if (NAME_ALIASES[apiName]) return NAME_ALIASES[apiName];

  // Try to find in WORLD_CUP_TEAMS
  const team = WORLD_CUP_TEAMS.find(
    (t) => t.englishName.toLowerCase() === apiName.toLowerCase() ||
               t.name.toLowerCase() === apiName.toLowerCase()
  );
  return team?.name || null;
}

function mapApiNameToEnglish(apiName: string | undefined): string | null {
  if (!apiName) return null;

  // Try to find in WORLD_CUP_TEAMS by englishName
  const team = WORLD_CUP_TEAMS.find(
    (t) => t.englishName.toLowerCase() === apiName.toLowerCase() ||
               t.name.toLowerCase() === apiName.toLowerCase()
  );
  return team?.englishName || null;
}
