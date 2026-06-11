'use client';

import { useEffect, useState, useMemo } from 'react';
import { buildConsensus, type ConsensusEntry } from '@/lib/worldcup-bench-data';

type ViewFilter = 'all' | 'group' | 'knockout';
type GroupFilter = string | 'all';

export default function ConsensusTable() {
  const [data, setData] = useState<ConsensusEntry[]>([]);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('group');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [sortBy, setSortBy] = useState<'agreement' | 'matchId'>('matchId');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => {
    setData(buildConsensus());
  }, []);

  const groups = useMemo(() => {
    const gs = new Set<string>();
    data.forEach(d => { if (d.group) gs.add(d.group); });
    return Array.from(gs).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];

    // Filter by phase
    if (viewFilter === 'group') {
      result = result.filter(d => d.stage === 'group_stage');
    } else if (viewFilter === 'knockout') {
      result = result.filter(d => d.stage !== 'group_stage');
    }

    // Filter by group
    if (groupFilter !== 'all' && viewFilter === 'group') {
      result = result.filter(d => d.group === groupFilter);
    }

    // Sort
    if (sortBy === 'agreement') {
      result.sort((a, b) => a.agreement - b.agreement);
    } else {
      result.sort((a, b) => a.matchId.localeCompare(b.matchId));
    }

    return result;
  }, [data, viewFilter, groupFilter, sortBy]);

  const getCountColor = (count: number, total: number, type: 'home' | 'draw' | 'away') => {
    const pct = count / total;
    if (type === 'home') return `rgba(0, 102, 255, ${0.15 + pct * 0.6})`;
    if (type === 'draw') return `rgba(255, 140, 66, ${0.15 + pct * 0.6})`;
    return `rgba(255, 50, 50, ${0.15 + pct * 0.6})`;
  };

  const getTextColor = (type: 'home' | 'draw' | 'away') => {
    if (type === 'home') return 'var(--wc-blue)';
    if (type === 'draw') return 'var(--wc-amber)';
    return '#ff4646';
  };

  const getMajorityColor = (agreement: number) => {
    if (agreement >= 70) return 'var(--wc-gold)';
    if (agreement >= 50) return 'var(--wc-amber)';
    return 'var(--wc-silver)';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      group_stage: 'GS',
      round_of_32: 'R32',
      round_of_16: 'R16',
      quarter_finals: 'QF',
      semi_finals: 'SF',
      third_place_match: '3rd',
      final: 'FINAL',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="text-2xl">🤖</div>
        <div>
          <h2 className="text-lg font-bold text-white">Multi-Model Consensus</h2>
          <p className="text-sm text-[var(--wc-silver)]">
            {data.length} matches · 10 models · Agreement heatmap
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Phase tabs */}
        <div className="flex glass-card gap-0" style={{ border: 'none', background: 'rgba(255,255,255,0.04)' }}>
          {(['group', 'knockout', 'all'] as ViewFilter[]).map(v => (
            <button
              key={v}
              onClick={() => { setViewFilter(v); setGroupFilter('all'); }}
              className={`tab-pill text-xs ${viewFilter === v ? 'active' : ''}`}
              style={{ padding: '8px 16px' }}
            >
              {v === 'group' ? 'Group Stage' : v === 'knockout' ? 'Knockout' : 'All'}
            </button>
          ))}
        </div>

        {/* Group filter */}
        {viewFilter === 'group' && (
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 text-sm text-white"
          >
            <option value="all">All Groups</option>
            {groups.map(g => <option key={g} value={g}>Group {g}</option>)}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="matchId">Sort by match</option>
          <option value="agreement">Sort by agreement (low first)</option>
        </select>

        <div className="text-sm text-[var(--wc-silver)] ml-auto self-center">
          {filtered.length} matches
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[var(--wc-silver)] text-xs uppercase tracking-wider border-b border-[rgba(255,255,255,0.06)]">
              <th className="text-left py-2 pr-2">Match</th>
              <th className="text-left py-2 px-2">Teams</th>
              <th className="text-center py-2 px-2" colSpan={3}>Consensus (Home · Draw · Away)</th>
              <th className="text-center py-2 px-2">Agreement</th>
              <th className="text-center py-2 px-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const { counts, total, agreement, majorityResult, homeTeam, awayTeam, matchId, stage, group } = entry;
              return (
                <>
                  <tr
                    key={matchId}
                    onClick={() => setExpandedMatch(expandedMatch === matchId ? null : matchId)}
                    className="border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 pr-2 whitespace-nowrap">
                      <span className="text-[var(--wc-silver)] text-xs">{getStageLabel(stage)}</span>
                      {group && <span className="text-[var(--wc-silver)] text-xs ml-1">· {group}</span>}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <span className="font-semibold">{homeTeam}</span>
                      <span className="text-[var(--wc-silver)] mx-1">vs</span>
                      <span className="font-semibold">{awayTeam}</span>
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <div
                        className="rounded-md px-2 py-1 text-xs font-bold"
                        style={{
                          background: getCountColor(counts.home, total, 'home'),
                          color: counts.home === Math.max(counts.home, counts.draw, counts.away) ? getTextColor('home') : 'var(--wc-silver)',
                        }}
                      >
                        {counts.home}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <div
                        className="rounded-md px-2 py-1 text-xs font-bold"
                        style={{
                          background: getCountColor(counts.draw, total, 'draw'),
                          color: counts.draw === Math.max(counts.home, counts.draw, counts.away) ? getTextColor('draw') : 'var(--wc-silver)',
                        }}
                      >
                        {counts.draw}
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <div
                        className="rounded-md px-2 py-1 text-xs font-bold"
                        style={{
                          background: getCountColor(counts.away, total, 'away'),
                          color: counts.away === Math.max(counts.home, counts.draw, counts.away) ? getTextColor('away') : 'var(--wc-silver)',
                        }}
                      >
                        {counts.away}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-xs font-bold" style={{ color: getMajorityColor(agreement) }}>
                        {agreement}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-xs font-bold" style={{ color: getTextColor(majorityResult) }}>
                        {majorityResult === 'home' ? '1' : majorityResult === 'draw' ? 'X' : '2'}
                      </span>
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {expandedMatch === matchId && (
                    <tr key={`${matchId}-detail`}>
                      <td colSpan={7} className="py-3 px-4 bg-[rgba(255,255,255,0.02)]">
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                          {entry.modelsHome.length > 0 && (
                            <div>
                              <div className="text-[var(--wc-blue)] font-semibold mb-1">🏠 Home ({entry.modelsHome.length})</div>
                              <div className="text-[var(--wc-silver)]">{entry.modelsHome.join(', ')}</div>
                            </div>
                          )}
                          {entry.modelsDraw.length > 0 && (
                            <div>
                              <div className="text-[var(--wc-amber)] font-semibold mb-1">⚖️ Draw ({entry.modelsDraw.length})</div>
                              <div className="text-[var(--wc-silver)]">{entry.modelsDraw.join(', ')}</div>
                            </div>
                          )}
                          {entry.modelsAway.length > 0 && (
                            <div>
                              <div className="text-[#ff4646] font-semibold mb-1">✈️ Away ({entry.modelsAway.length})</div>
                              <div className="text-[var(--wc-silver)]">{entry.modelsAway.join(', ')}</div>
                            </div>
                          )}
                        </div>
                        {/* Consensus bar */}
                        <div className="mt-3 h-5 rounded-lg overflow-hidden flex">
                          {counts.home > 0 && (
                            <div
                              className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{
                                width: `${(counts.home / total) * 100}%`,
                                background: 'linear-gradient(90deg, var(--wc-blue), var(--wc-blue-glow))',
                              }}
                            >
                              {counts.home > 1 && `${Math.round((counts.home / total) * 100)}%`}
                            </div>
                          )}
                          {counts.draw > 0 && (
                            <div
                              className="h-full flex items-center justify-center text-[10px] font-bold"
                              style={{
                                width: `${(counts.draw / total) * 100}%`,
                                background: 'linear-gradient(90deg, var(--wc-amber), #FFB366)',
                                color: 'var(--wc-navy)',
                              }}
                            >
                              {counts.draw > 1 && `${Math.round((counts.draw / total) * 100)}%`}
                            </div>
                          )}
                          {counts.away > 0 && (
                            <div
                              className="h-full flex items-center justify-center text-[10px] font-bold text-white"
                              style={{
                                width: `${(counts.away / total) * 100}%`,
                                background: 'linear-gradient(90deg, #ff4646, #ff6666)',
                              }}
                            >
                              {counts.away > 1 && `${Math.round((counts.away / total) * 100)}%`}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-[var(--wc-silver)]">
          No matches match the current filter.
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-[var(--wc-silver)]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--wc-blue)' }} /> Home
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--wc-amber)' }} /> Draw
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full" style={{ background: '#ff4646' }} /> Away
        </span>
        <span className="ml-auto">Click a row to expand model details</span>
      </div>
    </div>
  );
}
