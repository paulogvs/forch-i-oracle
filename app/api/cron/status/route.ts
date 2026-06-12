// FORCH.i ORACLE — API Route: Cron Job Status
// Returns the status of all cron jobs.
// GET /api/cron/status

import { NextResponse } from 'next/server';
import { getDataLayerAsync } from '@/lib/data-layer';
import { validateCronAuth } from '@/lib/cron-auth';

export async function GET(request: Request) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const db = await getDataLayerAsync();

  const jobs = ['ingest', 'recalculate', 'simulate'];
  const statuses: Record<string, unknown> = {};

  for (const jobName of jobs) {
    const status = await db.getCronStatus(jobName);
    statuses[jobName] = status || { jobName, status: 'never_run' };
  }

  return NextResponse.json({
    success: true,
    jobs: statuses,
  });
}
