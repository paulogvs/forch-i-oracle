import { NextResponse } from 'next/server';
import { getDataLayer } from '@/lib/data-layer';

export async function GET() {
  try {
    const db = getDataLayer();
    const ingestStatus = await db.getCronStatus('ingest').catch(() => null);
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      lastIngest: ingestStatus?.lastRun ?? null,
      changed: Boolean(ingestStatus?.lastRun),
    });
  } catch {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      lastIngest: null,
      changed: false,
    });
  }
}
