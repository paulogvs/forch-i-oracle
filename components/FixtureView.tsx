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

const TABS: { id: FixtureTab; label: string }[] = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'r32', label: '1/16' },
  { id: 'r16', label: '1/8' },
  { id: 'cuartos', label: '1/4' },
  { id: 'semis', label: '1/2' },
  { id: 'finales', label: 'Final' },
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
      {/* Tab nav */}
      <div className="sticky top-0 z-50 bg-canvas/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div ref={tabsRef} className="flex overflow-x-auto scrollbar-hide px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 py-3 px-2 text-xs font-semibold transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'text-white border-accent-primary'
                  : 'text-fg-disabled border-transparent hover:text-fg-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-4 animate-fade-in" key={activeTab}>
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

        {activeTab === 'r32' && <BracketPhase title="Dieciseisavos" matches={bracket.roundOf32} />}
        {activeTab === 'r16' && <BracketPhase title="Octavos" matches={bracket.roundOf16} />}
        {activeTab === 'cuartos' && <BracketPhase title="Cuartos" matches={bracket.quarters} />}

        {activeTab === 'semis' && (
          <div className="space-y-6">
            <BracketPhase title="Semifinales" matches={bracket.semis} />
            <BracketPhase title="Tercer Puesto" matches={[bracket.thirdPlace]} />
          </div>
        )}

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
            <BracketPhase title="La Gran Final" matches={[bracket.final]} />
            <BracketPhase title="Tercer Puesto" matches={[bracket.thirdPlace]} />
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
