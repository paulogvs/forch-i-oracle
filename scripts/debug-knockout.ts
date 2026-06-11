import { calculateStatisticalPrediction } from '../lib/predictor-engine';
import { ALL_MATCHES, MATCHES_BY_GROUP } from '../lib/matches';

// ═══════════════════════════════════════════════════════════════
// Simulate group stage to get qualified teams
// ═══════════════════════════════════════════════════════════════

async function simulateGroupStage() {
  const groupStandings: Record<string, { name: string; pts: number; gd: number; gf: number }[]> = {};

  for (const group of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const groupMatches = MATCHES_BY_GROUP[group] || [];
    const teams = new Set<string>();
    for (const m of groupMatches) {
      teams.add(m.homeTeam);
      teams.add(m.awayTeam);
    }

    const standings: Record<string, { pts: number; gd: number; gf: number; ga: number }> = {};
    for (const t of teams) {
      standings[t] = { pts: 0, gd: 0, gf: 0, ga: 0 };
    }

    for (const match of groupMatches) {
      const pred = await calculateStatisticalPrediction(match.homeTeam, match.awayTeam);
      const homeGoals = pred.predictedScoreHome;
      const awayGoals = pred.predictedScoreAway;

      standings[match.homeTeam].gf += homeGoals;
      standings[match.homeTeam].ga += awayGoals;
      standings[match.homeTeam].gd = standings[match.homeTeam].gf - standings[match.homeTeam].ga;
      standings[match.awayTeam].gf += awayGoals;
      standings[match.awayTeam].ga += homeGoals;
      standings[match.awayTeam].gd = standings[match.awayTeam].gf - standings[match.awayTeam].ga;

      if (homeGoals > awayGoals) standings[match.homeTeam].pts += 3;
      else if (awayGoals > homeGoals) standings[match.awayTeam].pts += 3;
      else { standings[match.homeTeam].pts += 1; standings[match.awayTeam].pts += 1; }
    }

    const sorted = Object.entries(standings)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);

    groupStandings[group] = sorted;
  }

  return groupStandings;
}

function resolveQualifiedTeams(groupStandings: Record<string, any[]>) {
  const winners = new Map<string, string>();
  const runnersUp = new Map<string, string>();
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[] = [];

  for (const [group, standings] of Object.entries(groupStandings)) {
    if (standings.length >= 3) {
      winners.set(group, standings[0].name);
      runnersUp.set(group, standings[1].name);
      thirdPlaces.push({ name: standings[2].name, pts: standings[2].pts, gd: standings[2].gd, gf: standings[2].gf, group });
    }
  }

  thirdPlaces.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf);
  const bestThird = thirdPlaces.slice(0, 8);

  return { winners, runnersUp, bestThird };
}

function resolveTeam(slot: string, qualified: any, koWinners: Map<string, string>, koLosers?: Map<string, string>): string {
  if (slot.startsWith('W-')) {
    return koWinners.get(slot) || 'TBD';
  }
  if (slot.startsWith('L-') && koLosers) {
    return koLosers.get(slot) || 'TBD';
  }

  // Simple group position: "1A", "2B", etc.
  if (/^[12][A-L]$/.test(slot)) {
    const pos = parseInt(slot[0]);
    const group = slot[1];
    if (pos === 1) return qualified.winners.get(group) || 'TBD';
    if (pos === 2) return qualified.runnersUp.get(group) || 'TBD';
  }

  // Third place criteria: "3B/3E/3F/3G" etc. — pick from best third places
  if (slot.includes('3')) {
    const groups = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    for (const tp of qualified.bestThird) {
      if (groups.includes(tp.group)) return tp.name;
    }
    // Fallback: return first best third
    return qualified.bestThird[0]?.name || 'TBD';
  }

  return 'TBD';
}

async function main() {
  console.log('═══ FORCH.i ORACLE — Knockout Stage Predictor ═══\n');

  // Phase 1: Simulate group stage
  console.log('⏳ Simulating group stage...');
  const groupStandings = await simulateGroupStage();
  const qualified = resolveQualifiedTeams(groupStandings);

  console.log('\n═══ Group Stage Qualifiers ═══');
  for (const group of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
    const s = groupStandings[group];
    if (!s) continue;
    console.log(`  Grupo ${group}: 1° ${s[0]?.name} | 2° ${s[1]?.name} | 3° ${s[2]?.name}`);
  }

  console.log(`\n  Mejores terceros: ${qualified.bestThird.map(t => t.name).join(', ')}`);

  // Phase 2: Simulate knockout
  console.log('\n═══ Knockout Predictions ═══\n');

  const koWinners = new Map<string, string>();
  const koLosers = new Map<string, string>();
  const knockoutMatches = ALL_MATCHES.filter(m => m.round !== 'group');

  // Round of 32
  console.log('── 1/16 Final (Round of 32) ──');
  const r32 = knockoutMatches.filter(m => m.round === 'round-32');
  for (const m of r32) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  [${m.round}] ${m.homeTeam} vs ${m.awayTeam} → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    const winner = pred.predictedScoreHome >= pred.predictedScoreAway ? home : away;
    koWinners.set(`W-${m.id}`, winner);

    console.log(`  [${m.round.padEnd(8)}] ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | ${pred.homeWin}/${pred.draw}/${pred.awayWin} | 🏆 ${winner}`);
  }

  // Round of 16
  console.log('\n── Octavos de Final (Round of 16) ──');
  const r16 = knockoutMatches.filter(m => m.round === 'round-16');
  for (const m of r16) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  [${m.round}] ${m.homeTeam} vs ${m.awayTeam} → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    const winner = pred.predictedScoreHome >= pred.predictedScoreAway ? home : away;
    koWinners.set(`W-${m.id}`, winner);

    console.log(`  [${m.round.padEnd(8)}] ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | ${pred.homeWin}/${pred.draw}/${pred.awayWin} | 🏆 ${winner}`);
  }

  // Quarterfinals
  console.log('\n── Cuartos de Final ──');
  const qf = knockoutMatches.filter(m => m.round === 'quarter');
  for (const m of qf) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  [${m.round}] ${m.homeTeam} vs ${m.awayTeam} → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    const winner = pred.predictedScoreHome >= pred.predictedScoreAway ? home : away;
    koWinners.set(`W-${m.id}`, winner);

    console.log(`  [${m.round.padEnd(8)}] ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | ${pred.homeWin}/${pred.draw}/${pred.awayWin} | 🏆 ${winner}`);
  }

  // Semifinals
  console.log('\n── Semifinales ──');
  const sf = knockoutMatches.filter(m => m.round === 'semi');
  for (const m of sf) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  [${m.round}] ${m.homeTeam} vs ${m.awayTeam} → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    const winner = pred.predictedScoreHome >= pred.predictedScoreAway ? home : away;
    const loser = winner === home ? away : home;
    koWinners.set(`W-${m.id}`, winner);
    koLosers.set(`L-${m.id}`, loser);

    console.log(`  [${m.round.padEnd(8)}] ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | ${pred.homeWin}/${pred.draw}/${pred.awayWin} | 🏆 ${winner}`);
  }

  // Third place
  console.log('\n── Tercer Puesto ──');
  const third = knockoutMatches.filter(m => m.round === 'third');
  for (const m of third) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    console.log(`  ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | 🏆 ${pred.predictedScoreHome >= pred.predictedScoreAway ? home : away}`);
  }

  // Final
  console.log('\n── 🏆 GRAN FINAL ──');
  const final = knockoutMatches.filter(m => m.round === 'final');
  for (const m of final) {
    const home = resolveTeam(m.homeTeam, qualified, koWinners, koLosers);
    const away = resolveTeam(m.awayTeam, qualified, koWinners, koLosers);

    if (home === 'TBD' || away === 'TBD') {
      console.log(`  → TBD`);
      continue;
    }

    const pred = await calculateStatisticalPrediction(home, away);
    const champion = pred.predictedScoreHome >= pred.predictedScoreAway ? home : away;
    console.log(`  ${home.padEnd(16)} vs ${away.padEnd(16)} → ${pred.predictedScoreHome}-${pred.predictedScoreAway} | ${pred.homeWin}/${pred.draw}/${pred.awayWin}`);
    console.log(`\n  🏆 CAMPEÓN PREDICHO: ${champion}`);
  }

  console.log('\n═══ Done ═══');
}

main().catch(console.error);
