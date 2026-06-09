'use client';

import { getTeamsByGroup, getTeamByName } from '@/lib/teams';
import { GROUPS } from '@/lib/matches';

interface GroupTableProps {
  selectedGroup?: string;
}

function getTeamFlag(teamName: string): string {
  const team = getTeamByName(teamName);
  return team?.flag || '🏳️';
}

// Simulated standings (placeholder data — would be calculated from actual results)
function getSimulatedStandings(group: string) {
  const teams = getTeamsByGroup(group);
  // Random-ish but deterministic standings based on group letter
  const seed = group.charCodeAt(0);
  const sorted = [...teams].sort((a, b) => {
    // Use confederation prestige as proxy: UEFA > CONMEBOL > others
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
  const activeGroup = selectedGroup || 'A';
  const standings = getSimulatedStandings(activeGroup);

  return (
    <div className="w-full">
      {/* Group selector tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
        {GROUPS.map((group) => (
          <button
            key={group}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
              group === activeGroup
                ? 'bg-forch-gold text-black shadow-md'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-white font-bold text-center">
            Grupo {activeGroup} — Fase de Grupos
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs uppercase">
                <th className="text-left py-3 px-3 w-8">#</th>
                <th className="text-left py-3 px-3">Equipo</th>
                <th className="text-center py-3 px-2">PJ</th>
                <th className="text-center py-3 px-2">G</th>
                <th className="text-center py-3 px-2">E</th>
                <th className="text-center py-3 px-2">P</th>
                <th className="text-center py-3 px-2 hidden sm:table-cell">GF</th>
                <th className="text-center py-3 px-2 hidden sm:table-cell">GC</th>
                <th className="text-center py-3 px-2 hidden sm:table-cell">DG</th>
                <th className="text-center py-3 px-3 font-bold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team) => (
                <tr
                  key={team.code}
                  className={`border-t border-white/5 transition-colors ${
                    team.position <= 2
                      ? 'bg-green-500/5'
                      : team.position === 3
                      ? 'bg-yellow-500/5'
                      : ''
                  }`}
                >
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                      team.position <= 2 ? 'text-green-400' : team.position === 3 ? 'text-yellow-400' : 'text-gray-500'
                    }`}>
                      {team.position}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-white font-medium">
                      {getTeamFlag(team.name)} {team.name}
                    </span>
                  </td>
                  <td className="text-center py-2.5 px-2 text-gray-300">{team.played}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300">{team.won}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300">{team.drawn}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300">{team.lost}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300 hidden sm:table-cell">{team.goalsFor}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300 hidden sm:table-cell">{team.goalsAgainst}</td>
                  <td className="text-center py-2.5 px-2 text-gray-300 hidden sm:table-cell">
                    {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                  </td>
                  <td className="text-center py-2.5 px-3">
                    <span className="text-white font-bold">{team.points}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-3 border-t border-white/10 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-gray-400">Clasifica directamente</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="text-gray-400">Posible clasificación (3° puesto)</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-3">
        ⏳ Tabla preliminar — se actualizará con los resultados reales del torneo
      </p>
    </div>
  );
}
