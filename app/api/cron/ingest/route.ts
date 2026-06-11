// FORCH.i ORACLE — Cron Job: Data Ingestion
// Vercel Cron job that ingests data from API-Football and updates Supabase/in-memory store.
// Schedule: Every 6 hours
// Trigger: GET /api/cron/ingest

import { NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';
import { getComprehensiveTeamStats, getMatchContext, getTeamStats } from '@/lib/football-api';
import {
  calculateMomentum,
  calculateAdjustedXG,
  type MatchResult as EngineMatchResult,
} from '@/lib/enhanced-engine';

// Secret to protect cron endpoints from unauthorized access
const CRON_SECRET = process.env.CRON_SECRET || 'forchi-cron-secret-2026';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const urlParam = new URL(request.url).searchParams.get('secret');

  if (authHeader !== `Bearer ${CRON_SECRET}` && urlParam !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = getDataLayer();
  const results = {
    teamsProcessed: 0,
    formsUpdated: 0,
    injuriesFound: 0,
    errors: [] as string[],
  };

  try {
    console.log('[cron:ingest] Starting data ingestion...');

    // 1. Get all teams
    const teams = await db.getAllTeams();
    console.log(`[cron:ingest] Found ${teams.length} teams to process`);

    // 2. For each team, fetch real stats, form, and injuries
    for (const team of teams) {
      try {
        console.log(`[cron:ingest] Processing: ${team.name}`);

        // Fetch comprehensive stats from API-Football
        const stats = await getComprehensiveTeamStats(team.name);
        if (stats) {
          console.log(
            `[cron:ingest] Stats for ${team.name}: goals/match=${stats.goalsPerMatch.toFixed(2)}, winRate=${stats.winRate}%`
          );
          results.teamsProcessed++;
        }

        // Fetch recent form and injuries via getTeamStats
        const teamStats = await getTeamStats(team.name);
        const form = teamStats?.recentForm || [];
        const injuries = teamStats?.injuries || [];

        if (form && form.length > 0) {
          // Convert form to match results for enhanced engine
          const matchResults: EngineMatchResult[] = form.map((f, i) => ({
            opponent: 'Unknown',
            goalsFor: f === 'W' ? 2 : f === 'D' ? 1 : 0,
            goalsAgainst: f === 'W' ? 0 : f === 'D' ? 1 : 2,
            result: f as 'W' | 'D' | 'L',
            date: new Date(Date.now() - i * 86400000 * 3).toISOString().split('T')[0],
          }));

          // Calculate momentum
          const momentum = calculateMomentum(matchResults);

          // Calculate adjusted xG
          const adjustedXG = calculateAdjustedXG(team.name, matchResults.map(m => ({
            goals: m.goalsFor,
            competition: 'Friendly', // Default since we don't know the source
            date: m.date,
          })));

          // Save team form
          await db.saveTeamForm({
            teamId: team.name,
            last5: form.map((f, i) => ({
              result: f as 'W' | 'D' | 'L',
              opponent: 'Unknown',
              goalsFor: matchResults[i].goalsFor,
              goalsAgainst: matchResults[i].goalsAgainst,
              date: matchResults[i].date,
            })),
            xgFor: adjustedXG,
            xgAgainst: adjustedXG * 0.8, // Estimate
            momentum,
            matchesPlayed: form.length,
            eloDynamic: team.eloRating + (momentum * 30), // Dynamic Elo adjustment
          });

          results.formsUpdated++;
          console.log(`[cron:ingest] Form saved for ${team.name}: momentum=${momentum.toFixed(2)}`);
        }

        if (injuries && injuries.length > 0) {
          results.injuriesFound += injuries.length;
          console.log(`[cron:ingest] Found ${injuries.length} injuries for ${team.name}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[cron:ingest] Error processing ${team.name}:`, msg);
        results.errors.push(`${team.name}: ${msg}`);
      }
    }

    const duration = Date.now() - startTime;

    // Update cron status
    await db.updateCronStatus({
      jobName: 'ingest-data',
      lastRun: new Date().toISOString(),
      status: 'success',
      durationMs: duration,
      recordsProcessed: results.teamsProcessed,
    });

    console.log(`[cron:ingest] Completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      duration,
      teamsProcessed: results.teamsProcessed,
      formsUpdated: results.formsUpdated,
      injuriesFound: results.injuriesFound,
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
