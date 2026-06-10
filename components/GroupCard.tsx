'use client';

import type { TournamentBracket } from '@/lib/tournament-sim';
import { getTeamByName } from '@/lib/teams';

interface GroupCardProps {
  group: TournamentBracket['groups'][number];
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Group header */}
      <div className="bg-gradient-to-r from-wc-blue/20 to-wc-amber/20 px-4 py-2.5 border-b border-white/5">
        <h3 className="text-sm font-bold text-white text-center tracking-wide">
          GRUPO {group.group}
        </h3>
      </div>

      {/* Standings table */}
      <div className="p-3">
        <div className="grid grid-cols-5 text-[9px] text-wc-silver font-semibold uppercase tracking-wider mb-1.5 px-1">
          <span className="col-span-2">Equipo</span>
          <span className="text-center">PJ</span>
          <span className="text-center">DG</span>
          <span className="text-center">Pts</span>
        </div>
        
        {group.teams.map((team, i) => {
          const flag = team.flag || '🏳️';
          const isQualified = i < 2 || (i < 4 && team.points >= 4);
          
          return (
            <div
              key={team.name}
              className={`grid grid-cols-5 items-center py-1.5 px-1 rounded-lg transition-colors
                ${isQualified ? 'bg-wc-blue/5' : ''}`}
            >
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-sm">{flag}</span>
                <span className="text-xs font-medium text-white truncate">{team.name}</span>
              </div>
              <span className="text-center text-xs text-wc-silver font-mono">{team.played}</span>
              <span className={`text-center text-xs font-mono ${team.goalDiff > 0 ? 'text-green-400' : team.goalDiff < 0 ? 'text-red-400' : 'text-wc-silver'}`}>
                {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
              </span>
              <span className="text-center text-xs font-bold text-wc-gold font-mono">{team.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
