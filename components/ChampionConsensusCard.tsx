'use client';

import { getChampionConsensus, getTeamStageConsensus, ALL_MODELS, getModelInfo } from '@/lib/worldcup-bench-data';
import { useEffect, useState } from 'react';

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
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">🏆</div>
        <div>
          <h2 className="text-lg font-bold text-white">Champion Consensus</h2>
          <p className="text-sm text-[var(--wc-silver)]">
            Across {ALL_MODELS.length} AI models — pre-tournament predictions
          </p>
        </div>
      </div>

      {/* Top pick highlight */}
      {topTeam && (
        <div className="champion-podium mb-6">
          <div className="text-3xl font-black text-[var(--wc-gold)] mb-1">
            {topTeam.team}
          </div>
          <div className="text-sm text-[var(--wc-silver)]">
            Top pick — {topTeam.count}/{ALL_MODELS.length} models ({topTeam.pct}%)
          </div>
        </div>
      )}

      {/* Horizontal bar chart */}
      <div className="space-y-3">
        {championData.map(({ team, count, pct }) => (
          <div key={team} className="flex items-center gap-3">
            <div className="w-8 text-right text-sm font-bold text-white">{team}</div>
            <div className="flex-1">
              <div className="h-7 rounded-lg overflow-hidden relative glass-card" style={{ border: 'none', background: 'rgba(255,255,255,0.04)' }}>
                <div
                  className="h-full rounded-lg transition-all duration-700"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                    background: count === maxCount
                      ? 'linear-gradient(90deg, var(--wc-gold), #E6BC4A)'
                      : 'linear-gradient(90deg, var(--wc-blue), var(--wc-blue-glow))',
                    opacity: 0.8,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end pr-3">
                  <span className="text-xs font-bold text-white drop-shadow-lg">
                    {count}/{ALL_MODELS.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top 4 finish breakdown */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-[var(--wc-silver)] mb-3 uppercase tracking-wider">
          Teams by Top-4 finish consensus
        </h3>
        <div className="space-y-1">
          {teamData.filter(t => t.totalTop4 > 0).map((team) => (
            <div key={team.team}>
              <button
                onClick={() => setExpandedTeam(expandedTeam === team.team ? null : team.team)}
                className="match-row w-full text-left flex items-center gap-2"
              >
                <div className="w-8 text-sm font-bold">{team.team}</div>
                <div className="flex gap-1 flex-1">
                  {Array.from({ length: team.champion }).map((_, i) => (
                    <div key={`champ-${i}`} className="w-3 h-3 rounded-full" style={{ background: 'var(--wc-gold)' }} title="Champion" />
                  ))}
                  {Array.from({ length: team.runnerUp }).map((_, i) => (
                    <div key={`ru-${i}`} className="w-3 h-3 rounded-full" style={{ background: 'var(--wc-silver)' }} title="Runner-up" />
                  ))}
                  {Array.from({ length: team.thirdPlace }).map((_, i) => (
                    <div key={`3rd-${i}`} className="w-3 h-3 rounded-full" style={{ background: '#CD7F32' }} title="Third place" />
                  ))}
                  {Array.from({ length: team.fourthPlace }).map((_, i) => (
                    <div key={`4th-${i}`} className="w-3 h-3 rounded-sm" style={{ background: 'var(--wc-silver)', opacity: 0.5 }} title="Fourth place" />
                  ))}
                </div>
                <div className="text-xs text-[var(--wc-silver)]">{team.totalTop4}</div>
              </button>
              {expandedTeam === team.team && (
                <div className="px-4 pb-2 text-xs text-[var(--wc-silver)] space-y-1">
                  <div className="flex gap-4">
                    <span>🥇 Champion: {team.champion}</span>
                    <span>🥈 Runner-up: {team.runnerUp}</span>
                    <span>🥉 Third: {team.thirdPlace}</span>
                    <span>4th: {team.fourthPlace}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
