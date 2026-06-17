// FORCH.i ORACLE — Cron Authentication
// Shared CRON_SECRET validation for all cron endpoints.
// Only accepts Bearer token via Authorization header (NO URL params — security).
// Requires CRON_SECRET env var — no hardcoded fallback.

import { NextResponse } from 'next/server';

/**
 * Validates cron job authorization via Bearer token ONLY.
 * URL query params are NOT accepted (prevents secret leakage in logs/history).
 * Returns null if authorized, or a NextResponse if unauthorized/not configured.
 *
 * @param request - The incoming Request object
 * @returns null (authorized) or NextResponse
 */
export function validateCronAuth(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn('[cron-auth] CRON_SECRET env var not set — cron jobs disabled');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const authHeader = request.headers.get('authorization');

  if (authHeader === `Bearer ${secret}`) {
    return null; // authorized
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
