// FORCH.i ORACLE — Admin: Manual Ingest Trigger
// POST /api/admin/ingest — Trigger data ingestion manually
// Requires CRON_SECRET as Bearer token in Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cron-auth';

export async function POST(request: NextRequest) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const crs = process.env.CRON_SECRET || '';
  const ingestUrl = `${url.origin}/api/cron/ingest`;

  try {
    const response = await fetch(ingestUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'FORCH-i-Oracle-Admin/1.0',
        Authorization: `Bearer ${crs}`,
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
