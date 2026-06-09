// FORCH.i ORACLE — Group standings for simulator
'use client';

import { getTeamFlag } from '@/lib/matches';

interface SimGroupStanding {
  group: string;
  teams: {
    name: string;
    flag: string;
    code: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDiff: number;
    points: number;
  }[];
}

interface SimGroupStandingsProps {
  groups: SimGroupStanding[];
  compact?: boolean;
}

export default function SimGroupStandings({ groups, compact = false }: SimGroupStandingsProps) {
  if (compact) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {groups.map((group) => (
          <div key={group.group} className="bg-white/5 border border-white/10 rounded-xl p-3">
            <h4 className="text-xs font-bold text-forch-gold mb-2 text-center">Grupo {group.group}</h4>
            <div className="space-y-1">
              {group.teams.map((team, i) => (
                <div
                  key={team.code}
                  className={`flex items-center justify-between text-xs ${
                    i < 2 ? 'text-green-400' : i === 2 ? 'text-yellow-400' : 'text-gray-500'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <span className="text-[10px] w-3">{i + 1}.</span>
                    <span>{getTeamFlag(team.name)} {team.name}</span>
                  </span>
                  <span className="font-bold">{team.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.group} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-white/5 border-b border-white/5">
            <h4 className="text-sm font-bold text-forch-gold">Grupo {group.group}</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 uppercase">
                  <th className="text-left py-2 px-3 w-6">#</th>
                  <th className="text-left py-2 px-3">Equipo</th>
                  <th className="text-center py-2 px-2">PJ</th>
                  <th className="text-center py-2 px-2">G</th>
                  <th className="text-center py-2 px-2">E</th>
                  <th className="text-center py-2 px-2">P</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">GF</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">GC</th>
                  <th className="text-center py-2 px-2 hidden sm:table-cell">DG</th>
                  <th className="text-center py-2 px-3 font-bold">Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.teams.map((team, i) => (
                  <tr
                    key={team.code}
                    className={`border-t border-white/5 ${
                      i < 2 ? 'bg-green-500/5' : i === 2 ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      <span className={`text-[10px] font-bold ${
                        i < 2 ? 'text-green-400' : i === 2 ? 'text-yellow-400' : 'text-gray-600'
                      }`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-white font-medium">
                        {getTeamFlag(team.name)} {team.name}
                      </span>
                    </td>
                    <td className="text-center py-2 px-2 text-gray-400">{team.played}</td>
                    <td className="text-center py-2 px-2 text-gray-400">{team.won}</td>
                    <td className="text-center py-2 px-2 text-gray-400">{team.drawn}</td>
                    <td className="text-center py-2 px-2 text-gray-400">{team.lost}</td>
                    <td className="text-center py-2 px-2 text-gray-400 hidden sm:table-cell">{team.goalsFor}</td>
                    <td className="text-center py-2 px-2 text-gray-400 hidden sm:table-cell">{team.goalsAgainst}</td>
                    <td className="text-center py-2 px-2 text-gray-400 hidden sm:table-cell">
                      {team.goalDiff > 0 ? `+${team.goalDiff}` : team.goalDiff}
                    </td>
                    <td className="text-center py-2 px-3">
                      <span className="text-white font-bold">{team.points}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
