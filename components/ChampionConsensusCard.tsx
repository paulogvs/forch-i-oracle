'use client';

import { getChampionConsensus, getTeamStageConsensus, ALL_MODELS, getModelInfo } from '@/lib/worldcup-bench-data';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TeamData {
  team: string;
  champion: number;
  runnerUp: number;
  thirdPlace: number;
  fourthPlace: number;
  totalTop4: number;
}

export default function ChampionConsensusCard() {
  const [championData, setChampionData] = useState<Array<{ team: string; count: number; pct: number }>>([]);
  const [teamData, setTeamData] = useState<TeamData[]>([]);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  useEffect(() => {
    setChampionData(getChampionConsensus());
    setTeamData(getTeamStageConsensus().slice(0, 12));
  }, []);

  const maxCount = Math.max(...championData.map(c => c.count), 1);
  const topTeam = championData[0];

  return (
    <div className="surface p-5 rounded-[var(--r-lg)] border border-border-subtle">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-[var(--r-md)] bg-tint-gold flex items-center justify-center text-xl">🏆</div>
        <div>
          <h2 className="text-base font-bold text-fg-primary">Consenso de Campeón</h2>
          <p className="text-xs text-fg-tertiary">
            {ALL_MODELS.length} modelos IA · Predicciones pre-torneo
          </p>
        </div>
      </div>

      {/* Top pick highlight */}
      {topTeam && (
        <div className="surface-gold p-4 rounded-[var(--r-lg)] mb-5 text-center">
          <div className="text-2xl font-black text-accent-premium mb-1">{topTeam.team}</div>
          <div className="text-xs text-fg-secondary">
            Top pick — {topTeam.count}/{ALL_MODELS.length} modelos ({topTeam.pct}%)
          </div>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div className="space-y-2.5">
        {championData.map(({ team, count, pct }) => (
          <div key={team} className="flex items-center gap-3">
            <div className="w-24 text-right text-xs font-bold text-fg-primary truncate">{team}</div>
            <div className="flex-1">
              <div className="h-7 rounded-lg overflow-hidden relative bg-raised/50">
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: count === maxCount
                      ? 'var(--gradient-gold)'
                      : 'var(--gradient-blue)',
                    opacity: 0.8,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="text-[10px] font-bold text-white drop-shadow-lg">
                    {count}/{ALL_MODELS.length}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs font-mono text-fg-tertiary w-10 text-right">{pct}%</span>
          </div>
        ))}
      </div>

      {/* Top 4 finish breakdown */}
      <div className="mt-5 pt-4 border-t border-border-subtle">
        <h3 className="text-xs font-semibold text-fg-secondary uppercase tracking-wider mb-3">
          Equipos por consenso Top-4
        </h3>
        <div className="space-y-1.5">
          {teamData.filter(t => t.totalTop4 > 0).map((team) => (
            <div key={team.team}>
              <button
                onClick={() => setExpandedTeam(expandedTeam === team.team ? null : team.team)}
                className="w-full text-left flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-elevated/50 transition-colors"
              >
                <div className="w-20 text-xs font-bold text-fg-primary truncate">{team.team}</div>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: team.champion }).map((_, i) => (
                    <div key={`champ-${i}`} className="w-3 h-3 rounded-full bg-accent-premium" title="Champion" />
                  ))}
                  {Array.from({ length: team.runnerUp }).map((_, i) => (
                    <div key={`ru-${i}`} className="w-3 h-3 rounded-full bg-accent-secondary" title="Runner-up" />
                  ))}
                  {Array.from({ length: team.thirdPlace }).map((_, i) => (
                    <div key={`3rd-${i}`} className="w-3 h-3 rounded-full bg-accent-primary" title="Third place" />
                  ))}
                  {Array.from({ length: team.fourthPlace }).map((_, i) => (
                    <div key={`4th-${i}`} className="w-3 h-3 rounded-sm bg-fg-tertiary/40" title="Fourth place" />
                  ))}
                </div>
                <div className="text-[11px] text-fg-tertiary font-mono">{team.totalTop4}</div>
              </button>
              {expandedTeam === team.team && (
                <div className="px-4 pb-2 text-[11px] text-fg-tertiary flex gap-3">
                  <span>🥇 {team.champion}</span>
                  <span>🥈 {team.runnerUp}</span>
                  <span>🥉 {team.thirdPlace}</span>
                  <span>4° {team.fourthPlace}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
