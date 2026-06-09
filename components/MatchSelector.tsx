'use client';

import { useState } from 'react';
import {
  getMatchesByGroup,
  GROUPS,
  formatMatchDate,
  formatMatchTime,
  getTeamFlag,
  type Match,
} from '@/lib/matches';

interface MatchSelectorProps {
  onMatchSelect: (homeTeam: string, awayTeam: string, match: Match) => void;
  selectedMatchId?: string;
}

export default function MatchSelector({ onMatchSelect, selectedMatchId }: MatchSelectorProps) {
  const [activeGroup, setActiveGroup] = useState<string>('A');
  const groupMatches = getMatchesByGroup(activeGroup);

  const handleSelect = (match: Match) => {
    if (match.homeTeam.startsWith('TBD') && match.awayTeam.startsWith('TBD')) return;
    onMatchSelect(match.homeTeam, match.awayTeam, match);
  };

  return (
    <div className="w-full">
      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setActiveGroup(group)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
              activeGroup === group
                ? 'bg-forch-gold text-black shadow-lg shadow-forch-gold/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Match Cards */}
      <div className="space-y-3">
        {groupMatches.map((match) => {
          const isSelected = match.id === selectedMatchId;
          const isFullyTBD =
            match.homeTeam.startsWith('TBD') && match.awayTeam.startsWith('TBD');
          const hasTBD =
            match.homeTeam.startsWith('TBD') || match.awayTeam.startsWith('TBD');

          const homeName = match.homeTeam.startsWith('TBD')
            ? `TBD`
            : match.homeTeam;
          const awayName = match.awayTeam.startsWith('TBD')
            ? `TBD`
            : match.awayTeam;

          const homeFlag =
            match.homeCode === 'TBD' ? '\u{1F3F3}\uFE0F' : getTeamFlag(match.homeTeam);
          const awayFlag =
            match.awayCode === 'TBD' ? '\u{1F3F3}\uFE0F' : getTeamFlag(match.awayTeam);

          return (
            <button
              key={match.id}
              onClick={() => handleSelect(match)}
              disabled={isFullyTBD}
              className={`w-full text-left rounded-xl p-4 transition-all duration-300 border ${
                isSelected
                  ? 'bg-forch-gold/15 border-forch-gold/50 shadow-lg shadow-forch-gold/10 scale-[1.02]'
                  : isFullyTBD
                  ? 'bg-white/[0.03] border-white/5 opacity-40 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-forch-gold/30 hover:shadow-md'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">
                  MD {match.matchday} &middot; {formatMatchDate(match)} &middot;{' '}
                  {formatMatchTime(match)}
                </span>
                {hasTBD && !isFullyTBD && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold uppercase tracking-wider">
                    TBD
                  </span>
                )}
              </div>

              {/* Teams row */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex-1 text-right">
                  <span className="text-lg font-bold text-white">
                    {homeFlag} {homeName}
                  </span>
                </div>
                <div className="flex-shrink-0 px-3">
                  <span
                    className={`text-lg font-black ${
                      isSelected ? 'text-forch-gold' : 'text-gray-600'
                    }`}
                  >
                    VS
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <span className="text-lg font-bold text-white">
                    {awayFlag} {awayName}
                  </span>
                </div>
              </div>

              {/* Venue */}
              <div className="mt-2 text-center text-xs text-gray-500">
                {match.venue} &middot; {match.city}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
