'use client';

import { useEffect, useState, useMemo } from 'react';
import { buildConsensus, type ConsensusEntry } from '@/lib/worldcup-bench-data';
import { cn } from '@/lib/utils';

type ViewFilter = 'all' | 'group' | 'knockout';
type GroupFilter = string | 'all';

export default function ConsensusTable() {
  const [data, setData] = useState<ConsensusEntry[]>([]);
  const [viewFilter, setViewFilter] = useState<ViewFilter>('group');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [sortBy, setSortBy] = useState<'agreement' | 'matchId'>('matchId');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  useEffect(() => { setData(buildConsensus()); }, []);

  const groups = useMemo(() => {
    const gs = new Set<string>();
    data.forEach(d => { if (d.group) gs.add(d.group); });
    return Array.from(gs).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = [...data];
    if (viewFilter === 'group') result = result.filter(d => d.stage === 'group_stage');
    else if (viewFilter === 'knockout') result = result.filter(d => d.stage !== 'group_stage');
    if (groupFilter !== 'all' && viewFilter === 'group') result = result.filter(d => d.group === groupFilter);
    if (sortBy === 'agreement') result.sort((a, b) => a.agreement - b.agreement);
    else result.sort((a, b) => a.matchId.localeCompare(b.matchId));
    return result;
  }, [data, viewFilter, groupFilter, sortBy]);

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      group_stage: 'GS', round_of_32: 'R32', round_of_16: 'R16',
      quarter_finals: 'QF', semi_finals: 'SF', third_place_match: '3rd', final: 'FINAL',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="surface p-5 rounded-[var(--r-lg)] border border-border-subtle">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-[var(--r-md)] bg-tint-violet flex items-center justify-center text-xl">🤖</div>
        <div>
          <h2 className="text-base font-bold text-fg-primary">Consenso Multi-Modelo</h2>
          <p className="text-xs text-fg-tertiary">
            {data.length} partidos · {filtered.length} mostrados · 10 modelos
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-0.5 p-1 bg-elevated rounded-[var(--r-lg)]">
          {(['group', 'knockout', 'all'] as ViewFilter[]).map(v => (
            <button key={v} onClick={() => { setViewFilter(v); setGroupFilter('all'); }} className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
              viewFilter === v ? "bg-accent-secondary text-white" : "text-fg-tertiary hover:text-fg-secondary"
            )}>
              {v === 'group' ? 'Grupos' : v === 'knockout' ? 'Eliminatorias' : 'Todos'}
            </button>
          ))}
        </div>
        {viewFilter === 'group' && (
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}
            className="bg-canvas border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg-secondary focus:border-accent-secondary/50 focus:outline-none">
            <option value="all">Todos los grupos</option>
            {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
          </select>
        )}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-canvas border border-border-subtle rounded-lg px-3 py-1.5 text-xs text-fg-secondary focus:border-accent-secondary/50 focus:outline-none">
          <option value="matchId">Ordenar por partido</option>
          <option value="agreement">Ordenar por acuerdo (bajo primero)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-fg-tertiary text-[10px] uppercase tracking-wider border-b border-border-subtle">
              <th className="text-left py-2 pr-2">Match</th>
              <th className="text-left py-2 px-2">Equipos</th>
              <th className="text-center py-2 px-1" colSpan={3}>Consenso (Local · Empate · Visita)</th>
              <th className="text-center py-2 px-2">Acuerdo</th>
              <th className="text-center py-2 px-2">Pred</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => {
              const { counts, total, agreement, majorityResult, homeTeam, awayTeam, matchId, stage, group } = entry;
              const maxCount = Math.max(counts.home, counts.draw, counts.away);
              return (
                <tr
                  key={matchId}
                  onClick={() => setExpandedMatch(expandedMatch === matchId ? null : matchId)}
                  className="border-b border-border-subtle hover:bg-elevated/30 cursor-pointer transition-colors"
                >
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <span className="text-fg-tertiary text-[10px]">{getStageLabel(stage)}</span>
                    {group && <span className="text-fg-tertiary text-[10px] ml-1">· {group}</span>}
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <span className="font-semibold text-fg-primary">{homeTeam}</span>
                    <span className="text-fg-tertiary mx-1">vs</span>
                    <span className="font-semibold text-fg-primary">{awayTeam}</span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <span className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold",
                      counts.home === maxCount ? "bg-accent-primary/15 text-accent-primary" : "bg-raised text-fg-tertiary"
                    )}>{counts.home}</span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <span className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold",
                      counts.draw === maxCount ? "bg-state-warning/15 text-state-warning" : "bg-raised text-fg-tertiary"
                    )}>{counts.draw}</span>
                  </td>
                  <td className="py-2 px-1 text-center">
                    <span className={cn(
                      "inline-block rounded-md px-2 py-0.5 text-[10px] font-bold",
                      counts.away === maxCount ? "bg-state-danger/15 text-state-danger" : "bg-raised text-fg-tertiary"
                    )}>{counts.away}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      "text-[10px] font-bold",
                      agreement >= 70 ? "text-accent-premium" : agreement >= 50 ? "text-state-warning" : "text-fg-tertiary"
                    )}>{agreement}%</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className={cn(
                      "text-[10px] font-bold",
                      majorityResult === 'home' ? "text-accent-primary" : majorityResult === 'draw' ? "text-state-warning" : "text-state-danger"
                    )}>{majorityResult === 'home' ? '1' : majorityResult === 'draw' ? 'X' : '2'}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-fg-tertiary text-xs">Sin partidos para este filtro.</div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex flex-wrap gap-4 text-[10px] text-fg-tertiary">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent-primary" /> Local</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-state-warning" /> Empate</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-state-danger" /> Visita</span>
        <span className="ml-auto">Haz clic en una fila para expandir</span>
      </div>
    </div>
  );
}
