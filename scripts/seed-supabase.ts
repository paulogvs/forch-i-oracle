// FORCH.i ORACLE — Seed Script for Supabase
// Run: npx tsx scripts/seed-supabase.ts
//
// Seeds all 48 teams and 128 matches from existing static data.

import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_TEAMS, ELO_RATINGS, POWER_RATINGS } from '../lib/teams';
import { ALL_MATCHES } from '../lib/matches';

async function seed() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // ─── Seed Teams ───────────────────────────────────────
  console.log('📋 Seeding teams...');
  const teams = WORLD_CUP_TEAMS.map(t => ({
    id: t.name,
    fifa_code: t.code,
    name: t.name,
    group_char: t.group,
    confederation: t.confederation,
    elo_rating: ELO_RATINGS[t.name]?.elo ?? 1500,
    power_ratings: POWER_RATINGS[t.name] ?? { attack: 50, defense: 50, midfield: 50 },
  }));

  const { error: teamError, count: teamCount } = await supabase
    .from('teams')
    .upsert(teams, { onConflict: 'id' });

  if (teamError) {
    console.error('❌ Team seed error:', teamError.message);
    process.exit(1);
  }
  console.log(`✅ Seeded ${teams.length} teams`);

  // ─── Seed Matches ─────────────────────────────────────
  console.log('⚽ Seeding matches...');
  const matches = ALL_MATCHES.map(m => ({
    id: m.id,
    match_number: m.matchday,
    group_char: m.group,
    round: m.round,
    home_team_id: m.homeTeam,
    away_team_id: m.awayTeam,
    match_date: m.date,
    match_time: m.time,
    venue: m.venue,
    city: m.city,
    status: 'scheduled',
  }));

  const { error: matchError } = await supabase
    .from('matches')
    .upsert(matches, { onConflict: 'id' });

  if (matchError) {
    console.error('❌ Match seed error:', matchError.message);
    process.exit(1);
  }
  console.log(`✅ Seeded ${matches.length} matches`);

  // ─── Verify ───────────────────────────────────────────
  const { count: teamDbCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });
  const { count: matchDbCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });

  console.log('');
  console.log('📊 Database status:');
  console.log(`   Teams: ${teamDbCount} in database`);
  console.log(`   Matches: ${matchDbCount} in database`);
  console.log('');
  console.log('🎉 Seed complete! Your Supabase database is ready.');
}

seed().catch(err => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
