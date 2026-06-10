'use client';

import type { SimulatedMatch } from '@/lib/tournament-sim';
import { getTeamByName } from '@/lib/teams';

interface BracketPhaseProps {
  title: string;
  icon: string;
  matches: SimulatedMatch[];
}

export default function BracketPhase({ title, icon, matches }: BracketPhaseProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2 px-1">
        <span>{icon}</span>
        {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matches.map((match, i) => (
          <BracketMatchCard key={match.id} match={match} delay={i * 50} />
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({ match, delay }: { match: SimulatedMatch; delay: number }) {
  const homeFlag = getTeamByName(match.homeTeam)?.flag || '❓';
  const awayFlag = getTeamByName(match.awayTeam)?.flag || '❓';
  const isComplete = match.winner !== 'TBD';

  return (
    <div
      className="glass-card p-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-wc-silver font-medium">{match.roundLabel}</span>
        {isComplete && (
          <span className="text-[10px] text-wc-gold font-semibold">Finalizado</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{homeFlag}</span>
            <span className={`text-sm font-medium ${match.winner === match.homeTeam ? 'text-wc-gold font-bold' : 'text-white/80'}`}>
              {match.homeTeam}
            </span>
          </div>
          <span className={`score-badge ${match.winner === match.homeTeam ? 'gold' : ''}`}>
            {match.homeScore ?? '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{awayFlag}</span>
            <span className={`text-sm font-medium ${match.winner === match.awayTeam ? 'text-wc-gold font-bold' : 'text-white/80'}`}>
              {match.awayTeam}
            </span>
          </div>
          <span className={`score-badge ${match.winner === match.awayTeam ? 'gold' : ''}`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
