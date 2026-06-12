// FORCH.i ORACLE — Admin: Manual Ingest Trigger
// POST /api/admin/ingest — Trigger data ingestion manually
// GET /api/admin/ingest — Also works (for easy browser testing)
// Requires CRON_SECRET as query param or Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cron-auth';

export async function POST(request: NextRequest) {
  return handleIngest(request);
}

export async function GET(request: NextRequest) {
  return handleIngest(request);
}

async function handleIngest(request: NextRequest) {
  // Reuse the same auth as cron jobs
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  // Forward to the cron ingest endpoint
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret') || '';

  const ingestUrl = `${url.origin}/api/cron/ingest?secret=${secret}`;

  try {
    const response = await fetch(ingestUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'FORCH-i-Oracle-Admin/1.0',
      },
    });

    const data = await response.json();

    return NextResponse.json({
      ...data,
      message: 'Ingest triggered manually via admin endpoint',
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to trigger ingest: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
