'use client';

import { useState } from 'react';
import {
  getMatchesByGroup,
  getMatchesByRound,
  GROUPS,
  formatMatchDate,
  formatMatchTime,
  getTeamFlag,
  getRoundName,
  type Match,
  type Round,
} from '@/lib/matches';

interface MatchSelectorProps {
  onMatchSelect: (homeTeam: string, awayTeam: string, match: Match) => void;
  selectedMatchId?: string;
}

type TabType = 'groups' | Round;

const KNOCKOUT_TABS: { id: Round; label: string }[] = [
  { id: 'round-32', label: '1/16' },
  { id: 'round-16', label: '1/8' },
  { id: 'quarter', label: '1/4' },
  { id: 'semi', label: '1/2' },
  { id: 'final', label: 'FINAL' },
];

export default function MatchSelector({ onMatchSelect, selectedMatchId }: MatchSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [activeGroup, setActiveGroup] = useState<string>('A');

  // Get matches based on active tab
  const displayMatches = activeTab === 'groups'
    ? getMatchesByGroup(activeGroup)
    : getMatchesByRound(activeTab);

  const handleSelect = (match: Match) => {
    if (match.isTBD) return;
    onMatchSelect(match.homeTeam, match.awayTeam, match);
  };

  const isKnockout = activeTab !== 'groups';

  return (
    <div className="w-full">
      {/* Main Tabs: Groups vs Knockout Rounds */}
      <div className="flex flex-wrap gap-2 mb-4 justify-center">
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'groups'
              ? 'bg-forch-gold text-black shadow-lg shadow-forch-gold/25'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          Fase de Grupos
        </button>
        {KNOCKOUT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-forch-gold text-black shadow-lg shadow-forch-gold/25'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Group Sub-Tabs (only when groups is active) */}
      {activeTab === 'groups' && (
        <div className="flex flex-wrap gap-1.5 mb-6 justify-center">
          {GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${
                activeGroup === group
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-white/[0.03] text-gray-500 hover:bg-white/5 hover:text-gray-300 border border-transparent'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {/* Round Title (knockout only) */}
      {isKnockout && (
        <div className="text-center mb-4">
          <span className="text-sm text-gray-400 font-medium">
            {getRoundName(activeTab)}
          </span>
        </div>
      )}

      {/* Match Cards */}
      <div className="space-y-3">
        {displayMatches.map((match) => {
          const isSelected = match.id === selectedMatchId;
          const isTBD = match.isTBD;

          const homeName = match.homeTeam;
          const awayName = match.awayTeam;

          const homeFlag = match.homeCode === 'TBD' || match.homeCode.length > 3
            ? '\u{1F3F3}\uFE0F'
            : getTeamFlag(match.homeTeam);
          const awayFlag = match.awayCode === 'TBD' || match.awayCode.length > 3
            ? '\u{1F3F3}\uFE0F'
            : getTeamFlag(match.awayTeam);

          return (
            <button
              key={match.id}
              onClick={() => handleSelect(match)}
              disabled={isTBD}
              className={`w-full text-left rounded-xl p-4 transition-all duration-300 border ${
                isSelected
                  ? 'bg-forch-gold/15 border-forch-gold/50 shadow-lg shadow-forch-gold/10 scale-[1.02]'
                  : isTBD
                  ? 'bg-white/[0.03] border-white/5 opacity-40 cursor-not-allowed'
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08] hover:border-forch-gold/30 hover:shadow-md'
              }`}
            >
              {/* Header row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 font-medium">
                  {isKnockout
                    ? `${formatMatchDate(match)} · ${formatMatchTime(match)}`
                    : `MD ${match.matchday} · ${formatMatchDate(match)} · ${formatMatchTime(match)}`
                  }
                </span>
                {isTBD && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-semibold uppercase tracking-wider">
                    Por definir
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
                {match.venue} · {match.city}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
