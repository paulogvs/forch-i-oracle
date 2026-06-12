// FORCH.i ORACLE — API Route: Health Check
// GET /api/health — Returns system health status
// Used by dashboard to verify Supabase connectivity and data freshness

import { NextResponse } from 'next/server';
import { getDataLayerAsync, isSupabaseActive } from '@/lib/data-layer';

export async function GET() {
  const startTime = Date.now();
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  };

  // Check Supabase connectivity
  try {
    const db = await getDataLayerAsync();
    const teams = await db.getAllTeams();
    const matches = await db.getAllMatches();
    const predictions = await db.getPredictionsForMatches(matches.map(m => m.id));
    const cronIngest = await db.getCronStatus('ingest');
    const cronRecalc = await db.getCronStatus('recalculate');
    const cronSim = await db.getCronStatus('simulate');

    health.database = {
      connected: true,
      supabaseActive: isSupabaseActive(),
      teams: teams.length,
      matches: matches.length,
      predictions: predictions.length,
    };

    health.cronJobs = {
      ingest: cronIngest ? {
        lastRun: cronIngest.lastRun,
        status: cronIngest.status,
      } : { status: 'never_run' },
      recalculate: cronRecalc ? {
        lastRun: cronRecalc.lastRun,
        status: cronRecalc.status,
      } : { status: 'never_run' },
      simulate: cronSim ? {
        lastRun: cronSim.lastRun,
        status: cronSim.status,
      } : { status: 'never_run' },
    };

    // Data freshness check
    const now = Date.now();
    const sixHoursAgo = now - 6 * 60 * 60 * 1000;
    const twelveHoursAgo = now - 12 * 60 * 60 * 1000;

    const lastIngest = cronIngest?.lastRun ? new Date(cronIngest.lastRun).getTime() : 0;
    const lastRecalc = cronRecalc?.lastRun ? new Date(cronRecalc.lastRun).getTime() : 0;

    health.freshness = {
      ingestStale: lastIngest < sixHoursAgo,
      recalculateStale: lastRecalc < twelveHoursAgo,
      lastIngest: cronIngest?.lastRun || 'never',
      lastRecalculate: cronRecalc?.lastRun || 'never',
    };

  } catch (error) {
    health.database = {
      connected: false,
      error: error instanceof Error ? error.message : String(error),
    };
    health.status = 'degraded';
  }

  health.responseTime = Date.now() - startTime;

  return NextResponse.json(health, {
    status: health.status === 'ok' ? 200 : 503,
  });
}
