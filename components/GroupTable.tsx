'use client';

import { useState } from 'react';
import { getTeamsByGroup, getTeamByName } from '@/lib/teams';
import { GROUPS } from '@/lib/matches';
import type { TournamentBracket } from '@/lib/tournament-sim';

interface GroupTableProps {
  selectedGroup?: string;
}

function getTeamFlag(teamName: string): string {
  const team = getTeamByName(teamName);
  return team?.flag || '🏳️';
}

function getSimulatedStandings(group: string) {
  const teams = getTeamsByGroup(group);
  const seed = group.charCodeAt(0);
  const sorted = [...teams].sort((a, b) => {
    const prestige = (confed: string) => {
      if (confed === 'UEFA') return 5;
      if (confed === 'CONMEBOL') return 4;
      if (confed === 'CAF') return 3;
      if (confed === 'AFC') return 2;
      if (confed === 'CONCACAF') return 2;
      return 1;
    };
    return (prestige(b.confederation) + (seed % 3)) - (prestige(a.confederation) + (seed % 2));
  });

  return sorted.map((team, i) => ({
    ...team,
    position: i + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  }));
}

export default function GroupTable({ selectedGroup }: GroupTableProps) {
  const [activeGroup, setActiveGroup] = useState(selectedGroup || 'A');
  const standings = getSimulatedStandings(activeGroup);

  return (
    <div className="w-full">
      {/* Group pills */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 ${
              group === activeGroup
                ? 'bg-white/15 text-white border border-white/20'
                : 'bg-white/[0.03] text-fg-disabled hover:bg-white/[0.06] hover:text-fg-secondary border border-transparent'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-fg-primary text-center">Grupo {activeGroup}</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-fg-disabled text-[10px] uppercase tracking-wider">
                <th className="text-left py-2.5 px-3 w-6">#</th>
                <th className="text-left py-2.5 px-3">Equipo</th>
                <th className="text-center py-2.5 px-2">PJ</th>
                <th className="text-center py-2.5 px-2">G</th>
                <th className="text-center py-2.5 px-2">E</th>
                <th className="text-center py-2.5 px-2">P</th>
                <th className="text-center py-2.5 px-2 hidden sm:table-cell">DG</th>
                <th className="text-center py-2.5 px-3 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr
                  key={team.code}
                  className={`border-t border-white/[0.04] transition-colors ${
                    team.position <= 2
                      ? 'bg-state-success/5'
                      : team.position === 3
                      ? 'bg-state-warning/5'
                      : ''
                  }`}
                >
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                      team.position <= 2 ? 'text-state-success' : team.position === 3 ? 'text-state-warning' : 'text-fg-disabled'
                    }`}>
                      {team.position}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="text-fg-primary text-xs font-medium">
                      {getTeamFlag(team.name)} {team.name}
                    </span>
                  </td>
                  <td className="text-center py-2 px-2 text-fg-secondary text-xs">{team.played}</td>
                  <td className="text-center py-2 px-2 text-fg-secondary text-xs">{team.won}</td>
                  <td className="text-center py-2 px-2 text-fg-secondary text-xs">{team.drawn}</td>
                  <td className="text-center py-2 px-2 text-fg-secondary text-xs">{team.lost}</td>
                  <td className="text-center py-2 px-2 text-fg-secondary text-xs hidden sm:table-cell">
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className="text-fg-primary text-xs font-bold">{team.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-white/[0.06] flex flex-wrap gap-4 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-state-success" />
            <span className="text-fg-disabled">Clasifica</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-state-warning" />
            <span className="text-fg-disabled">3er puesto</span>
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-fg-disabled mt-3">Preliminar — se actualizará con resultados reales</p>
    </div>
  );
}
