'use client';

import type { TournamentBracket } from '@/lib/tournament-sim';

interface GroupCardProps {
  group: TournamentBracket['groups'][number];
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <div className="glass-card-static overflow-hidden">
      {/* Header */}
      <div className="bg-accent-blue/10 px-4 py-2.5 border-b border-white/[0.06]">
        <h3 className="text-xs font-bold text-text-primary text-center uppercase tracking-wider">
          Grupo {group.group}
        </h3>
      </div>

      {/* Standings */}
      <div className="p-3">
        <div className="grid grid-cols-5 text-[9px] text-text-muted font-semibold uppercase tracking-wider mb-1.5 px-1">
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
              className={`grid grid-cols-5 items-center py-1.5 px-1 rounded-lg transition-colors ${
                isQualified ? 'bg-accent-blue/5' : ''
              }`}
            >
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-sm">{flag}</span>
                <span className="text-xs font-medium text-text-primary truncate">{team.name}</span>
              </div>
              <span className="text-center text-xs text-text-secondary font-mono">{team.played}</span>
              <span className={`text-center text-xs font-mono ${team.goalDiff > 0 ? 'text-accent-emerald' : team.goalDiff < 0 ? 'text-accent-crimson' : 'text-text-secondary'}`}>
                {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
              </span>
              <span className="text-center text-xs font-bold text-accent-gold font-mono">{team.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
