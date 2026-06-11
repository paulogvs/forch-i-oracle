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
import GroupTable from './GroupTable';

interface MatchSelectorProps {
  onMatchSelect: (homeTeam: string, awayTeam: string, match: Match) => void;
  selectedMatchId?: string;
}

type TabType = 'groups' | Round | 'table';

const KNOCKOUT_TABS: { id: Round; label: string }[] = [
  { id: 'round-32', label: '1/16' },
  { id: 'round-16', label: '1/8' },
  { id: 'quarter', label: '1/4' },
  { id: 'semi', label: '1/2' },
  { id: 'final', label: 'Final' },
];

export default function MatchSelector({ onMatchSelect, selectedMatchId }: MatchSelectorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [activeGroup, setActiveGroup] = useState<string>('A');

  const displayMatches =
    activeTab === 'groups' || activeTab === 'table'
      ? getMatchesByGroup(activeGroup)
      : getMatchesByRound(activeTab as Round);

  const handleSelect = (match: Match) => {
    if (match.isTBD) return;
    onMatchSelect(match.homeTeam, match.awayTeam, match);
  };

  const isKnockout = activeTab !== 'groups' && activeTab !== 'table';

  return (
    <div className="w-full">
      {/* ═══ MAIN TABS ═══ */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-4">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'groups'
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Grupos
        </button>
        {KNOCKOUT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('table')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 ${
            activeTab === 'table'
              ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
              : 'text-text-secondary hover:text-white'
          }`}
        >
          Tablas
        </button>
      </div>

      {/* ═══ GROUP PILLS (horizontal scroll) ═══ */}
      {activeTab === 'groups' && (
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setActiveGroup(group)}
              className={`shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeGroup === group
                  ? 'bg-white/15 text-white border border-white/20'
                  : 'bg-white/[0.03] text-text-muted hover:bg-white/[0.06] hover:text-text-secondary border border-transparent'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      )}

      {/* ═══ ROUND TITLE (knockout) ═══ */}
      {isKnockout && (
        <div className="mb-4">
          <span className="text-xs text-text-secondary font-medium">{getRoundName(activeTab)}</span>
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {activeTab === 'table' && <GroupTable />}

      {/* ═══ MATCH CARDS ═══ */}
      {activeTab !== 'table' && (
        <div className="space-y-2">
          {displayMatches.map((match) => {
            const isSelected = match.id === selectedMatchId;
            const isTBD = match.isTBD;

            const homeFlag =
              match.homeCode === 'TBD' || match.homeCode.length > 3
                ? '\u{1F3F3}\uFE0F'
                : getTeamFlag(match.homeTeam);
            const awayFlag =
              match.awayCode === 'TBD' || match.awayCode.length > 3
                ? '\u{1F3F3}\uFE0F'
                : getTeamFlag(match.awayTeam);

            return (
              <button
                key={match.id}
                onClick={() => handleSelect(match)}
                disabled={isTBD}
                className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
                  isSelected
                    ? 'bg-accent-gold/10 border-accent-gold/30 shadow-lg shadow-accent-gold/5'
                    : isTBD
                    ? 'bg-white/[0.02] border-white/[0.04] opacity-40 cursor-not-allowed'
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.1]'
                }`}
              >
                {/* Meta row */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] text-text-muted font-medium">
                    {isKnockout
                      ? `${formatMatchDate(match)} · ${formatMatchTime(match)}`
                      : `J${match.matchday} · ${formatMatchDate(match)} · ${formatMatchTime(match)}`}
                  </span>
                  {isTBD && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-amber/20 text-accent-amber font-semibold">
                      TBD
                    </span>
                  )}
                </div>

                {/* Teams row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-right">
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                      {homeFlag} {match.homeTeam}
                    </span>
                  </div>
                  <div className="shrink-0 px-3">
                    <span className={`text-xs font-bold ${isSelected ? 'text-accent-gold' : 'text-text-muted'}`}>
                      VS
                    </span>
                  </div>
                  <div className="flex-1 text-left">
                    <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                      {awayFlag} {match.awayTeam}
                    </span>
                  </div>
                </div>

                {/* Venue */}
                <div className="mt-2.5 text-center text-[11px] text-text-muted">
                  {match.venue} · {match.city}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
