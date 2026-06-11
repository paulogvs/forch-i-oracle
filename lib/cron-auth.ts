// FORCH.i ORACLE — Cron Authentication
// Shared CRON_SECRET validation for all cron endpoints.
// Requires CRON_SECRET env var — no hardcoded fallback (security).

import { NextResponse } from 'next/server';

/**
 * Validates cron job authorization via Bearer token or URL param.
 * Returns null if authorized, or a NextResponse 401 if unauthorized.
 *
 * @param request - The incoming Request object
 * @returns null (authorized) or NextResponse (401 unauthorized)
 */
export function validateCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('[cron-auth] CRON_SECRET env var not set — cron jobs disabled');
    return NextResponse.json(
      { error: 'Cron not configured' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const urlParam = new URL(request.url).searchParams.get('secret');

  if (authHeader === `Bearer ${secret}` || urlParam === secret) {
    return null; // authorized
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
