// FORCH.i ORACLE — Admin: Seed Missing Matches
// POST /api/admin/seed-matches — Seed any missing matches from ALL_MATCHES
// Requires CRON_SECRET as query param or Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cron-auth';
import { getDataLayerAsync } from '@/lib/data-layer';
import { ALL_MATCHES } from '@/lib/matches';

export async function POST(request: NextRequest) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const db = await getDataLayerAsync();
  let seeded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const match of ALL_MATCHES) {
    try {
      const existing = await db.getMatch(match.id);
      if (existing) {
        skipped++;
        continue;
      }

      await db.seedMatches([{
        id: match.id,
        matchNumber: ALL_MATCHES.indexOf(match) + 1,
        groupChar: match.group,
        round: match.round as any,
        homeTeamId: match.homeTeam,
        awayTeamId: match.awayTeam,
        matchDate: match.date,
        matchTime: match.time,
        venue: match.venue,
        city: match.city,
        status: 'scheduled',
      }]);
      seeded++;
    } catch (err) {
      errors.push(`${match.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Matches seeded: ${seeded} created, ${skipped} already existed`,
    seeded,
    skipped,
    totalInCode: ALL_MATCHES.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
