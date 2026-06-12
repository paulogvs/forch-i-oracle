// FORCH.i ORACLE — Admin: Seed Team Forms
// POST /api/admin/seed-team-forms — Seed team forms for all 48 teams
// Requires CRON_SECRET as query param or Authorization header

import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/cron-auth';
import { getDataLayerAsync } from '@/lib/data-layer';
import { WORLD_CUP_TEAMS, ELO_RATINGS } from '@/lib/teams';

export async function POST(request: NextRequest) {
  const unauthorized = validateCronAuth(request);
  if (unauthorized) return unauthorized;

  const db = await getDataLayerAsync();
  let seeded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const team of WORLD_CUP_TEAMS) {
    try {
      const existing = await db.getTeamForm(team.name);
      if (existing) {
        skipped++;
        continue;
      }

      const eloData = ELO_RATINGS[team.name];
      await db.saveTeamForm({
        teamId: team.name,
        last5: [],
        xgFor: eloData?.attack ?? 1.2,
        xgAgainst: eloData?.defense ?? 1.0,
        momentum: 0,
        matchesPlayed: 0,
        eloDynamic: eloData?.elo ?? 1500,
      });
      seeded++;
    } catch (err) {
      errors.push(`${team.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: `Team forms seeded: ${seeded} created, ${skipped} already existed`,
    seeded,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  });
}
