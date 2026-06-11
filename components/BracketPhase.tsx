'use client';

import type { SimulatedMatch } from '@/lib/tournament-sim';
import { getTeamByName } from '@/lib/teams';

interface BracketPhaseProps {
  title: string;
  matches: SimulatedMatch[];
}

export default function BracketPhase({ title, matches }: BracketPhaseProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider px-1">{title}</h3>
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
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-text-muted font-medium">{match.roundLabel}</span>
        {isComplete && (
          <span className="text-[10px] text-accent-gold font-semibold">Finalizado</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{homeFlag}</span>
            <span className={`text-xs font-medium ${match.winner === match.homeTeam ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>
              {match.homeTeam}
            </span>
          </div>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
            match.winner === match.homeTeam ? 'bg-accent-gold/15 text-accent-gold' : 'bg-white/[0.06] text-text-secondary'
          }`}>
            {match.homeScore ?? '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">{awayFlag}</span>
            <span className={`text-xs font-medium ${match.winner === match.awayTeam ? 'text-accent-gold font-bold' : 'text-text-primary'}`}>
              {match.awayTeam}
            </span>
          </div>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
            match.winner === match.awayTeam ? 'bg-accent-gold/15 text-accent-gold' : 'bg-white/[0.06] text-text-secondary'
          }`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>
    </div>
  );
}
