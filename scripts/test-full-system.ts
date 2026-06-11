// FORCH.i ORACLE — Full System Integration Test
import { getDataLayer } from '../lib/data-layer';
import { getLiveStandings, getLiveBracket, recalculateAfterResult } from '../lib/prediction-history';
import { ALL_MATCHES } from '../lib/matches';

async function runTests() {
  const db = getDataLayer();
  console.log('=== FORCH.i ORACLE - System Integration Test ===\n');

  // Test 1: Clear
  console.log('[1/6] Clearing previous results...');
  await db.clearMatchResults();
  console.log('  OK\n');

  // Test 2: Submit fictional MEX 2-0 RSA
  console.log('[2/6] Submitting MEX 2-0 RSA...');
  const mexMatch = ALL_MATCHES.find(m => m.homeTeam === 'Mexico' && m.awayTeam === 'Sudáfrica')
    || ALL_MATCHES.find(m => m.homeTeam === 'México' && m.awayTeam === 'Sudáfrica');
  if (!mexMatch) { console.error('  FAIL: MEX vs RSA not found'); process.exit(1); }
  console.log(`  Match: ${mexMatch.id} | ${mexMatch.homeTeam} vs ${mexMatch.awayTeam}`);
  const result = await recalculateAfterResult(mexMatch.id, 2, 0);
  console.log(`  OK - ${result.drifts.length} predictions recalculated\n`);

  // Test 3: Standings
  console.log('[3/6] Checking standings...');
  const standings = await getLiveStandings();
  const groupA = standings['A'];
  if (!groupA) { console.error('  FAIL: Group A missing'); process.exit(1); }
  console.log('  Grupo A:');
  groupA.forEach((t: any, i: number) => {
    console.log(`  ${i + 1}. ${t.name}: PJ=${t.played} Pts=${t.points} GF=${t.gf} GC=${t.ga}`);
  });
  const mex = groupA.find((t: any) => t.name === 'México' || t.name === 'Mexico');
  if (mex?.played === 1 && mex.points === 3) console.log('  OK: México standings correct\n');
  else { console.error('  FAIL: México standings wrong'); }

  // Test 4: Bracket
  console.log('[4/6] Checking bracket...');
  const bracket = await getLiveBracket();
  if (!bracket) { console.error('  FAIL: No bracket'); process.exit(1); }
  console.log(`  R32: ${bracket.roundOf32?.length || 0}, R16: ${bracket.roundOf16?.length || 0}`);
  const r32_1 = bracket.roundOf32?.find((m: any) => m.id === 'R32-1');
  if (r32_1) {
    console.log(`  R32-1: ${r32_1.homeTeam} vs ${r32_1.awayTeam}`);
    console.log(`  ${r32_1.homeTeam !== 'TBD' && r32_1.awayTeam !== 'TBD' ? 'OK' : 'WARN: TBD'}`);
  }
  console.log('');

  // Test 5: Chequia check
  console.log('[5/6] Checking for duplicate Chequia...');
  const chequiaR32 = bracket.roundOf32?.filter((m: any) => m.awayTeam === 'Chequia' || m.homeTeam === 'Chequia') || [];
  console.log(`  Chequia in R32: ${chequiaR32.length} matches`);
  console.log(`  ${chequiaR32.length <= 1 ? 'OK' : 'FAIL: Too many!'}\n`);

  // Test 6: Drift
  console.log('[6/6] Checking drift...');
  console.log(`  Drifts: ${result.drifts.length}`);
  if (result.drifts.length > 0) {
    const d = result.drifts[0];
    console.log(`  Sample: ${d.matchId} ${d.original.homeGoals}-${d.original.awayGoals} -> ${d.current.homeGoals}-${d.current.awayGoals}`);
    console.log(`  OK\n`);
  }

  console.log('=== Test Complete ===');
}

runTests().catch(err => { console.error('FAIL:', err); process.exit(1); });
