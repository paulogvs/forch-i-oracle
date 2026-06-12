'use client';

import type { SimulatedMatch } from '@/lib/tournament-sim';
import { getTeamByName } from '@/lib/teams';
import { HelpCircle } from 'lucide-react';
import { Surface } from '@/components/ui/Surface';

interface BracketPhaseProps {
  title: string;
  matches: SimulatedMatch[];
}

export default function BracketPhase({ title, matches }: BracketPhaseProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-fg-secondary uppercase tracking-wider px-1">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {matches.map((match, i) => (
          <BracketMatchCard key={match.id} match={match} delay={i * 50} />
        ))}
      </div>
    </div>
  );
}

function BracketMatchCard({ match, delay }: { match: SimulatedMatch; delay: number }) {
  const homeFlag = getTeamByName(match.homeTeam)?.flag;
  const awayFlag = getTeamByName(match.awayTeam)?.flag;
  const isComplete = match.winner !== 'TBD';

  return (
    <Surface variant="default" padding="sm" className={`animate-fade-in ${!isComplete ? 'opacity-60' : ''}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="t-micro">{match.roundLabel}</span>
        {isComplete && (
          <span className="text-[10px] text-accent-premium font-semibold">Finalizado</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {homeFlag ? <span className="text-sm">{homeFlag}</span> : <HelpCircle className="h-4 w-4 text-fg-tertiary" />}
            <span className={`text-xs font-medium ${match.winner === match.homeTeam ? 'text-accent-premium font-bold' : 'text-fg-primary'}`}>
              {match.homeTeam}
            </span>
          </div>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
            match.winner === match.homeTeam ? 'bg-accent-premium/15 text-accent-premium' : 'bg-overlay text-fg-secondary'
          }`}>
            {match.homeScore ?? '-'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {awayFlag ? <span className="text-sm">{awayFlag}</span> : <HelpCircle className="h-4 w-4 text-fg-tertiary" />}
            <span className={`text-xs font-medium ${match.winner === match.awayTeam ? 'text-accent-premium font-bold' : 'text-fg-primary'}`}>
              {match.awayTeam}
            </span>
          </div>
          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
            match.winner === match.awayTeam ? 'bg-accent-premium/15 text-accent-premium' : 'bg-overlay text-fg-secondary'
          }`}>
            {match.awayScore ?? '-'}
          </span>
        </div>
      </div>
    </Surface>
  );
}
