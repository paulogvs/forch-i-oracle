'use client';

import type { TournamentBracket } from '@/lib/tournament-sim';
import { Surface } from '@/components/ui/Surface';

interface GroupCardProps {
  group: TournamentBracket['groups'][number];
}

export default function GroupCard({ group }: GroupCardProps) {
  return (
    <Surface variant="elevated" padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="bg-accent-primary/10 px-4 py-2.5 border-b border-border-subtle">
        <h3 className="text-xs font-bold text-fg-primary text-center uppercase tracking-wider">
          Grupo {group.group}
        </h3>
      </div>

      {/* Standings */}
      <div className="p-3">
        <div className="grid grid-cols-5 text-[9px] text-fg-disabled font-semibold uppercase tracking-wider mb-1.5 px-1">
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
              className={`grid grid-cols-5 items-center py-1.5 px-1 rounded-lg transition-colors tabular-nums ${
                isQualified ? 'bg-accent-primary/5' : ''
              }`}
            >
              <div className="col-span-2 flex items-center gap-2">
                <span className="text-sm">{flag}</span>
                <span className="text-xs font-medium text-fg-primary truncate">{team.name}</span>
              </div>
              <span className="text-center text-xs text-fg-secondary font-mono">{team.played}</span>
              <span className={`text-center text-xs font-mono ${team.goalDiff > 0 ? 'text-state-success' : team.goalDiff < 0 ? 'text-state-danger' : 'text-fg-secondary'}`}>
                {team.goalDiff > 0 ? '+' : ''}{team.goalDiff}
              </span>
              <span className="text-center text-xs font-bold text-accent-premium font-mono">{team.points}</span>
            </div>
          );
        })}
      </div>
    </Surface>
  );
}
