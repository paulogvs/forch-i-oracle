import { getDataLayerAsync } from './data-layer';
import { ALL_MATCHES } from './matches';

interface QualifiedTeams {
  groupWinners: Map<string, string>;
  groupRunnersUp: Map<string, string>;
  bestThirdPlaces: string[];
  groupStandings: Record<string, any[]>;
  thirdPlaceGroups: { name: string; group: string }[];
}

function resolveGroupQualifiers(groupStandings: Record<string, any[]>): QualifiedTeams {
  const qualified: QualifiedTeams = {
    groupWinners: new Map(),
    groupRunnersUp: new Map(),
    bestThirdPlaces: [],
    groupStandings,
    thirdPlaceGroups: [],
  };

  const allGroups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const thirdPlaces: { name: string; pts: number; gd: number; gf: number; group: string }[] = [];

  for (const group of allGroups) {
    const standings = groupStandings[group];
    if (!standings || standings.length < 3) continue;

    qualified.groupWinners.set(group, standings[0].name);
    qualified.groupRunnersUp.set(group, standings[1].name);
    thirdPlaces.push({
      name: standings[2].name,
      pts: standings[2].pts,
      gd: standings[2].gd,
      gf: standings[2].gf,
      group,
    });
  }

  thirdPlaces.sort((a, b) =>
    b.pts !== a.pts ? b.pts - a.pts : b.gd !== a.gd ? b.gd - a.gd : b.gf - a.gf
  );
  qualified.bestThirdPlaces = thirdPlaces.slice(0, 8).map(tp => tp.name);
  qualified.thirdPlaceGroups = thirdPlaces.slice(0, 8).map(tp => ({ name: tp.name, group: tp.group }));

  return qualified;
}

function resolveTeamSlot(
  slot: string,
  qualified: QualifiedTeams,
  winners: Map<string, string>,
  losers?: Map<string, string>
): string {
  if (slot.startsWith('W-')) return winners.get(slot) || 'TBD';
  if (slot.startsWith('L-') && losers) return losers.get(slot) || 'TBD';

  if (slot.length === 2 && /^[12]/.test(slot[0]) && /[A-L]/.test(slot[1])) {
    const pos = parseInt(slot[0]);
    const group = slot[1];
    if (pos === 1) return qualified.groupWinners.get(group) || 'TBD';
    if (pos === 2) return qualified.groupRunnersUp.get(group) || 'TBD';
  }

  if (slot.length === 2 && slot[0] === '3') {
    const group = slot[1];
    const standings = qualified.groupStandings?.[group];
    if (standings && standings.length >= 3) return standings[2].name;
    return 'TBD';
  }

  if (slot.includes('3')) {
    const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    for (const tp of qualified.bestThirdPlaces) {
      const tpGroupInfo = qualified.thirdPlaceGroups?.find((t: any) => t.name === tp);
      if (tpGroupInfo && groupLetters.includes(tpGroupInfo.group)) return tp;
    }
    return qualified.bestThirdPlaces[0] || 'TBD';
  }

  return 'TBD';
}

export async function resolveKnockoutTeamNames(db: Awaited<ReturnType<typeof getDataLayerAsync>>): Promise<number> {
  const allResults = await db.getMatchResults();
  if (allResults.length === 0) return 0;

  const allMatches = await db.getAllMatches();
  const resultsMap = new Map(allResults.map(r => [r.matchId, r]));

  const allGroups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const groupStandings: Record<string, any[]> = {};

  for (const groupChar of allGroups) {
    const groupMatches = allMatches.filter(m => m.groupChar === groupChar && m.round === 'group');
    const teamStats = new Map<string, { pts: number; gf: number; ga: number; gd: number; played: number }>();

    for (const match of groupMatches) {
      const result = resultsMap.get(match.id);
      if (!result) continue;

      if (!teamStats.has(match.homeTeamId)) teamStats.set(match.homeTeamId, { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 });
      if (!teamStats.has(match.awayTeamId)) teamStats.set(match.awayTeamId, { pts: 0, gf: 0, ga: 0, gd: 0, played: 0 });

      const home = teamStats.get(match.homeTeamId)!;
      const away = teamStats.get(match.awayTeamId)!;

      home.gf += result.homeScore; home.ga += result.awayScore; home.played++;
      away.gf += result.awayScore; away.ga += result.homeScore; away.played++;

      if (result.homeScore > result.awayScore) { home.pts += 3; }
      else if (result.awayScore > result.homeScore) { away.pts += 3; }
      else { home.pts += 1; away.pts += 1; }
    }
    const standings = Array.from(teamStats.entries())
      .map(([name, s]) => ({ name, pts: s.pts, gf: s.gf, ga: s.ga, gd: s.gf - s.ga }))
      .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
    groupStandings[groupChar] = standings;
  }

  const qualified = resolveGroupQualifiers(groupStandings);
  const winners = new Map<string, string>();
  const losers = new Map<string, string>();
  const usedThirdPlaces = new Set<string>();

  const getThirdPlace = (slot: string): string => {
    const groupLetters = slot.match(/3([A-L])/g)?.map(g => g[1]) || [];
    for (const tp of qualified.bestThirdPlaces) {
      const tpInfo = qualified.thirdPlaceGroups.find(t => t.name === tp);
      if (tpInfo && groupLetters.includes(tpInfo.group) && !usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    for (const tp of qualified.bestThirdPlaces) {
      if (!usedThirdPlaces.has(tp)) {
        usedThirdPlaces.add(tp);
        return tp;
      }
    }
    return 'TBD';
  };

  const roundOrder = ['R32', 'R16', 'R8', 'SF', 'TP', 'F'];
  const slotPattern = /^[12][A-L]$|^3[A-L]|\/|^W-|^L-/;
  let totalUpdated = 0;

  for (const round of roundOrder) {
    const roundMatches = allMatches.filter(m => m.round === round).sort((a, b) => a.id.localeCompare(b.id));
    for (const match of roundMatches) {
      let homeTeam = match.homeTeamId;
      let awayTeam = match.awayTeamId;

      if (slotPattern.test(homeTeam)) {
        homeTeam = homeTeam.includes('/') || (homeTeam.startsWith('3') && homeTeam.length > 2)
          ? getThirdPlace(homeTeam) : resolveTeamSlot(homeTeam, qualified, winners, losers);
      }
      if (slotPattern.test(awayTeam)) {
        awayTeam = awayTeam.includes('/') || (awayTeam.startsWith('3') && awayTeam.length > 2)
          ? getThirdPlace(awayTeam) : resolveTeamSlot(awayTeam, qualified, winners, losers);
      }

      if (homeTeam !== match.homeTeamId || awayTeam !== match.awayTeamId) {
        await db.updateMatch(match.id, { homeTeamId: homeTeam, awayTeamId: awayTeam });
        totalUpdated++;
      }

      if (homeTeam !== 'TBD' && awayTeam !== 'TBD') {
        const result = resultsMap.get(match.id);
        if (result) {
          if (result.homeScore > result.awayScore) {
            winners.set(`W-${match.id}`, homeTeam);
            losers.set(`L-${match.id}`, awayTeam);
          } else if (result.awayScore > result.homeScore) {
            winners.set(`W-${match.id}`, awayTeam);
            losers.set(`L-${match.id}`, homeTeam);
          } else {
            // Draw in knockout should have pen winner, but if not assume home
            winners.set(`W-${match.id}`, homeTeam);
            losers.set(`L-${match.id}`, awayTeam);
          }
        }
      }
    }
  }
  return totalUpdated;
}
