// FORCH.i ORACLE — Seed Script for Supabase (v2)
// Run: npx tsx scripts/seed-supabase.ts
//
// Seeds all 48 teams and 128 matches from existing static data.
// This script is idempotent — safe to run multiple times.

import { createClient } from '@supabase/supabase-js';
import { WORLD_CUP_TEAMS, ELO_RATINGS, POWER_RATINGS } from '../lib/teams';
import { ALL_MATCHES } from '../lib/matches';

async function seed() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment');
    console.error('   Add them to .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key);

  console.log('🚀 FORCH.i ORACLE — Supabase Seed v2');
  console.log('═══════════════════════════════════════\n');

  // ─── Seed Teams ───────────────────────────────────────
  console.log('📋 Seeding 48 teams...');
  const teams = WORLD_CUP_TEAMS.map(t => ({
    id: t.name,
    fifa_code: t.code,
    name: t.name,
    english_name: t.englishName,
    group_char: t.group,
    confederation: t.confederation,
    elo_rating: ELO_RATINGS[t.name]?.elo ?? 1500,
    attack_rating: ELO_RATINGS[t.name]?.attack ?? 1.0,
    defense_rating: ELO_RATINGS[t.name]?.defense ?? 1.0,
    power_ratings: POWER_RATINGS[t.name] ?? { attack: 50, defense: 50, midfield: 50 },
    star_players: t.starPlayers,
  }));

  const { error: teamError } = await supabase
    .from('teams')
    .upsert(teams, { onConflict: 'id' });

  if (teamError) {
    console.error('❌ Team seed error:', teamError.message);
    process.exit(1);
  }
  console.log(`✅ Seeded ${teams.length} teams\n`);

  // ─── Seed Matches ─────────────────────────────────────
  console.log('⚽ Seeding 128 matches...');
  const matches = ALL_MATCHES.map((m, idx) => ({
    id: m.id,
    match_number: idx + 1,
    group_char: m.group,
    round: m.round,
    home_team_id: m.homeTeam,
    away_team_id: m.awayTeam,
    home_code: m.homeCode,
    away_code: m.awayCode,
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
  console.log(`✅ Seeded ${matches.length} matches\n`);

  // ─── Seed Team Form (initial) ─────────────────────────
  console.log('📊 Seeding initial team form...');
  const teamForms = WORLD_CUP_TEAMS.map(t => ({
    team_id: t.name,
    last_5: [],
    xg_for: ELO_RATINGS[t.name]?.attack ?? 1.2,
    xg_against: ELO_RATINGS[t.name]?.defense ?? 1.0,
    momentum: 0,
    matches_played: 0,
    elo_dynamic: ELO_RATINGS[t.name]?.elo ?? 1500,
  }));

  const { error: formError } = await supabase
    .from('team_form')
    .upsert(teamForms, { onConflict: 'team_id' });

  if (formError) {
    console.error('⚠️  Team form seed warning:', formError.message);
    // Non-critical, continue
  } else {
    console.log(`✅ Seeded ${teamForms.length} team forms\n`);
  }

  // ─── Verify ───────────────────────────────────────────
  console.log('═══════════════════════════════════════');
  console.log('📊 Database Status:');
  console.log('═══════════════════════════════════════\n');

  const { count: teamDbCount } = await supabase.from('teams').select('*', { count: 'exact', head: true });
  const { count: matchDbCount } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  const { count: formDbCount } = await supabase.from('team_form').select('*', { count: 'exact', head: true });

  console.log(`   Teams:       ${teamDbCount} in database`);
  console.log(`   Matches:     ${matchDbCount} in database`);
  console.log(`   Team Forms:  ${formDbCount} in database`);
  console.log('');

  // ─── Verify Groups ────────────────────────────────────
  const { data: groupCounts } = await supabase
    .from('teams')
    .select('group_char')
    .order('group_char');

  if (groupCounts) {
    const groups: Record<string, number> = {};
    for (const t of groupCounts) {
      groups[t.group_char] = (groups[t.group_char] || 0) + 1;
    }
    console.log('   Teams by Group:');
    for (const [g, c] of Object.entries(groups).sort()) {
      console.log(`     Group ${g}: ${c} teams`);
    }
    console.log('');
  }

  // ─── Verify Rounds ────────────────────────────────────
  const { data: roundCounts } = await supabase
    .from('matches')
    .select('round')
    .order('round');

  if (roundCounts) {
    const rounds: Record<string, number> = {};
    for (const m of roundCounts) {
      rounds[m.round] = (rounds[m.round] || 0) + 1;
    }
    console.log('   Matches by Round:');
    for (const [r, c] of Object.entries(rounds)) {
      console.log(`     ${r}: ${c} matches`);
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════');
  console.log('🎉 Seed complete! Database is ready.');
  console.log('═══════════════════════════════════════');
}

seed().catch(err => {
  console.error('💥 Seed failed:', err);
  process.exit(1);
});
