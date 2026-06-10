'use client';

import { useState, useEffect, useRef } from 'react';
import GroupCard from './GroupCard';
import BracketPhase from './BracketPhase';
import Top8Ranking from './Top8Ranking';
import ChampionPodium from './ChampionPodium';
import type { TournamentBracket, ChampionProbability } from '@/lib/tournament-sim';

type FixtureTab = 'grupos' | 'r32' | 'r16' | 'cuartos' | 'semis' | 'finales';

interface FixtureViewProps {
  bracket: TournamentBracket;
  top8?: ChampionProbability[];
  totalSims?: number;
}

const TABS: { id: FixtureTab; label: string; icon: string }[] = [
  { id: 'grupos', label: 'Grupos', icon: '📋' },
  { id: 'r32', label: '1/16', icon: '🏟️' },
  { id: 'r16', label: 'Octavos', icon: '⚡' },
  { id: 'cuartos', label: 'Cuartos', icon: '🔥' },
  { id: 'semis', label: 'Semis', icon: '💎' },
  { id: 'finales', label: 'Finales', icon: '🏆' },
];

export default function FixtureView({ bracket, top8 = [], totalSims = 100 }: FixtureViewProps) {
  const [activeTab, setActiveTab] = useState<FixtureTab>('grupos');
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bracket.champion && bracket.champion !== 'TBD') {
      setActiveTab('finales');
    }
  }, [bracket.champion]);

  return (
    <div className="relative z-10">
      {/* TAB NAVIGATION — Sticky + scrollable */}
      <div className="sticky top-0 z-50 bg-wc-navy/90 backdrop-blur-xl border-b border-white/5">
        <div ref={tabsRef} className="flex overflow-x-auto scrollbar-hide px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-pill flex-1 min-w-0 ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="mr-1">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="p-3 md:p-4 space-y-4 animate-fade-in" key={activeTab}>
        
        {/* GRUPOS */}
        {activeTab === 'grupos' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {bracket.groups.map((group) => (
                <GroupCard key={group.group} group={group} />
              ))}
            </div>
            {top8.length > 0 && (
              <div className="mt-4">
                <Top8Ranking data={top8} totalSims={totalSims} />
              </div>
            )}
          </>
        )}

        {/* 1/16 FINAL */}
        {activeTab === 'r32' && (
          <BracketPhase title="Dieciseisavos de Final" icon="🏟️" matches={bracket.roundOf32} />
        )}

        {/* OCTAVOS */}
        {activeTab === 'r16' && (
          <BracketPhase title="Octavos de Final" icon="⚡" matches={bracket.roundOf16} />
        )}

        {/* CUARTOS */}
        {activeTab === 'cuartos' && (
          <BracketPhase title="Cuartos de Final" icon="🔥" matches={bracket.quarters} />
        )}

        {/* SEMIS */}
        {activeTab === 'semis' && (
          <div className="space-y-6">
            <BracketPhase title="Semifinales" icon="💎" matches={bracket.semis} />
            <BracketPhase title="Tercer Puesto" icon="🥉" matches={[bracket.thirdPlace]} />
          </div>
        )}

        {/* FINALES */}
        {activeTab === 'finales' && (
          <div className="space-y-6 max-w-lg mx-auto">
            {bracket.champion && bracket.champion !== 'TBD' && (
              <ChampionPodium
                champion={bracket.champion}
                championFlag={bracket.championFlag}
                runnerUp={bracket.runnerUp}
                runnerUpFlag={bracket.runnerUpFlag}
              />
            )}
            <BracketPhase title="La Gran Final" icon="🏆" matches={[bracket.final]} />
            <BracketPhase title="Tercer Puesto" icon="🥉" matches={[bracket.thirdPlace]} />
            {top8.length > 0 && (
              <div className="mt-6">
                <Top8Ranking data={top8} totalSims={totalSims} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
