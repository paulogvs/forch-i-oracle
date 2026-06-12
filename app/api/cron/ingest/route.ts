// FORCH.i ORACLE — Cron Job: Data Ingestion
// GitHub Actions cron job that ingests data from API-Football and updates data layer.
// Schedule: Every 6 hours
// Trigger: GET /api/cron/ingest
//
// AUTO-RECALCULATE: After ingesting real results, triggers full re-simulation
// of remaining bracket with updated predictions and drift tracking.

import { NextResponse } from 'next/server';
import { getDataLayerAsync, type IDataLayer } from '@/lib/data-layer';
import { WORLD_CUP_TEAMS } from '@/lib/teams';
import { validateCronAuth } from '@/lib/cron-auth';

const getApiKey = () => process.env.FOOTBALL_API_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

async function apiFetch(endpoint: string): Promise<Record<string, unknown> | null> {
  const API_KEY = getApiKey();
  if (!API_KEY) return null;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'x-apisports-key': API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.errors && Object.keys(data.errors).length > 0) return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const startTime = Date.now();
  const db = await getDataLayerAsync();
  const results = {
    fixturesProcessed: 0,
    resultsIngested: 0,
    formsUpdated: 0,
    errors: [] as string[],
  };

  try {
    console.log('[cron:ingest] Starting World Cup data ingestion...');

    // 1. Fetch World Cup 2026 fixtures from API-Football
    // League ID 9 = World Cup, Season 2026
    const wcData = await apiFetch('/fixtures?league=9&season=2026');

    if (!wcData?.response) {
      console.log('[cron:ingest] No World Cup fixtures found (tournament may not have started)');
      // Try 2025 (qualifiers) as fallback
      const wcQualData = await apiFetch('/fixtures?league=9&season=2025');
      if (!wcQualData?.response) {
        console.log('[cron:ingest] No WC qualifiers found either. Using baseline data.');
        // Fall back to baseline: ensure all teams have basic form data
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
      } else {
        results.fixturesProcessed = await processFixtures(wcQualData.response as any[], db, results);
      }
    } else {
      results.fixturesProcessed = await processFixtures(wcData.response as any[], db, results);
    }

    // AUTO-RECALCULATE: If new results were ingested, trigger recalculate cron
    // Note: Full re-simulation is handled by /api/cron/recalculate to avoid timeouts
    if (results.resultsIngested > 0) {
      console.log(`[cron:ingest] ${results.resultsIngested} new results ingested. Recalculation handled by /api/cron/recalculate.`);
    }

    const duration = Date.now() - startTime;

    await db.updateCronStatus({
      jobName: 'ingest-data',
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
      errors: results.errors.length > 0 ? results.errors : undefined,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[cron:ingest] Fatal error:', msg);

    await db.updateCronStatus({
      jobName: 'ingest-data',
      lastRun: new Date().toISOString(),
      status: 'failed',
      error: msg,
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function processFixtures(
  fixtures: any[],
  db: IDataLayer,
  results: { resultsIngested: number; formsUpdated: number; errors: string[] }
): Promise<number> {
  let processed = 0;

  for (const fixture of fixtures) {
    try {
      const status = fixture.fixture?.status?.short;
      const homeName = fixture.teams?.home?.name;
      const awayName = fixture.teams?.away?.name;
      const homeGoals = fixture.goals?.home;
      const awayGoals = fixture.goals?.away;

      // Only process finished matches with scores
      if (status !== 'FT' || homeGoals === null || awayGoals === null) continue;

      // Map API-Football team names to our Spanish names
      const homeTeam = mapApiNameToSpanish(homeName);
      const awayTeam = mapApiNameToSpanish(awayName);

      if (!homeTeam || !awayTeam) continue;

      // Find matching match in our database
      const match = await db.getMatchByTeams(homeTeam, awayTeam);
      if (!match) continue;

      // Check if we already have this result
      const existingResults = await db.getMatchResults();
      if (existingResults.some(r => r.matchId === match.id)) continue;

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
