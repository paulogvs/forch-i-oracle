// FORCH.i ORACLE — API Route: Cron Job Status
// Returns the status of all cron jobs.
// GET /api/cron/status

import { NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';

const CRON_SECRET = process.env.CRON_SECRET || 'forchi-cron-secret-2026';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const urlParam = new URL(request.url).searchParams.get('secret');

  if (authHeader !== `Bearer ${CRON_SECRET}` && urlParam !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDataLayer();

  const jobs = ['ingest-data', 'recalculate-predictions', 'simulate-tournament'];
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
