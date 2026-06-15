'use client';

import { useState, useEffect } from 'react';
import ChampionConsensusCard from '@/components/ChampionConsensusCard';
import ConsensusTable from '@/components/ConsensusTable';
import { ALL_MODELS, getModelInfo, validate, getTeamStageConsensus } from '@/lib/worldcup-bench-data';
import type { ModelInfo } from '@/lib/worldcup-bench-data';
import { cn } from '@/lib/utils';

interface OraclePrediction {
  id: string; homeTeam: string; awayTeam: string;
  predictedScore: [number, number] | null; homeWinPct: number; drawPct: number; awayWinPct: number;
}

export default function BenchmarkPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; modelsLoaded: number; groupMatches: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'consensus' | 'models' | 'about' | 'oracle'>('consensus');
  const [top4Data, setTop4Data] = useState<any[]>([]);
  const [oraclePredictions, setOraclePredictions] = useState<OraclePrediction[]>([]);
  const [oracleLoading, setOracleLoading] = useState(false);

  useEffect(() => {
    setModels(ALL_MODELS.map((name) => getModelInfo(name)));
    setValidation(validate());
    setTop4Data(getTeamStageConsensus().slice(0, 16));
  }, []);

  // Fetch ORACLE predictions when oracle tab is selected
  useEffect(() => {
    if (activeTab === 'oracle' && oraclePredictions.length === 0) {
      setOracleLoading(true);
      fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) })
        .then(r => r.json())
        .then(data => {
          if (data.success && data.fixture) {
            setOraclePredictions(data.fixture.map((m: any) => ({
              id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam,
              predictedScore: m.predictedScore ?? null,
              homeWinPct: m.homeWinPct ?? 0, drawPct: m.drawPct ?? 0, awayWinPct: m.awayWinPct ?? 0,
            })));
          }
        })
        .catch(() => {})
        .finally(() => setOracleLoading(false));
    }
  }, [activeTab, oraclePredictions.length]);

  const championTeams = Array.from(new Set(models.map(m => m.champion)));

  // Compute ORACLE agreement data
  const oracleChampion = oraclePredictions.length > 0 ? (() => {
    // Find highest champion probability from predictions
    const championProbs: Record<string, number> = {};
    for (const p of oraclePredictions) {
      if (p.homeWinPct > 50) championProbs[p.homeTeam] = (championProbs[p.homeTeam] || 0) + 1;
    }
    return Object.entries(championProbs).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  })() : null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade">
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-secondary/10 border border-accent-secondary/20 text-[10px] font-semibold text-accent-secondary mb-2">
          🤖 WorldCupBench
        </div>
        <h1 className="text-lg sm:text-xl font-bold text-fg-primary">Multi-Modelo Benchmark</h1>
        <p className="text-[11px] text-fg-tertiary">{ALL_MODELS.length} modelos IA · Prompt v2.1</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-elevated rounded-[var(--r-xl)] border border-border-subtle">
        {[
          { id: 'consensus' as const, label: '🏆 Consenso' },
          { id: 'oracle' as const, label: '🔮 ORACLE' },
          { id: 'models' as const, label: '📊 Modelos' },
          { id: 'about' as const, label: 'ℹ️ Info' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
            "flex-1 py-2 px-3 rounded-[var(--r-lg)] text-[11px] font-semibold transition-all",
            activeTab === tab.id ? "bg-accent-secondary text-white shadow-lg shadow-accent-secondary/20" : "text-fg-secondary hover:text-fg-primary hover:bg-raised/50"
          )}>{tab.label}</button>
        ))}
      </div>

      {/* Consensus */}
      {activeTab === 'consensus' && (
        <div className="space-y-4 animate-fade">
          <ChampionConsensusCard />
          <ConsensusTable />
        </div>
      )}

      {/* Models */}
      {activeTab === 'models' && (
        <div className="space-y-4 animate-fade">
          {/* Model list — single column */}
          <div className="space-y-2">
            {models.map((m, i) => {
              const champCount = models.filter(x => x.champion === m.champion).length;
              const isTopPick = champCount === Math.max(...championTeams.map(t => models.filter(x => x.champion === t).length));
              return (
                <div key={m.name} className={cn(
                  "p-3 rounded-[var(--r-lg)] border animate-rise",
                  isTopPick ? "bg-tint-gold/10 border-accent-premium/20" : "surface border-border-subtle"
                )} style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-fg-primary">{m.name}</h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-secondary/10 text-[9px] font-bold text-accent-secondary">{m.promptVersion}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-accent-premium font-semibold">🏆 {m.champion}</span>
                    <span className="text-fg-disabled">·</span>
                    <span className="text-accent-primary">🥈 {m.runnerUp}</span>
                    <span className="text-fg-disabled">·</span>
                    <span className="text-accent-secondary">🥉 {m.thirdPlace}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Champion distribution — horizontal */}
          <div>
            <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider mb-2">Distribución Campeones</h3>
            <div className="space-y-1.5">
              {championTeams.map(team => {
                const count = models.filter(m => m.champion === team).length;
                const pct = Math.round((count / ALL_MODELS.length) * 100);
                const maxCount = Math.max(...championTeams.map(t => models.filter(m => m.champion === t).length));
                const isLeader = count === maxCount;
                return (
                  <div key={team} className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-fg-primary w-24 text-right truncate">{team}</span>
                    <div className="flex-1 h-5 bg-raised/50 rounded-md overflow-hidden relative">
                      <div className={cn("h-full rounded-md transition-all", isLeader ? "bg-gradient-to-r from-accent-premium/60 to-accent-premium/30" : "bg-gradient-to-r from-accent-primary/50 to-accent-primary/20")} style={{ width: `${(count / maxCount) * 100}%` }} />
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-white drop-shadow">{count}/{ALL_MODELS.length}</span>
                    </div>
                    <span className={cn("text-[10px] font-mono w-8 text-right", isLeader ? "text-accent-premium font-bold" : "text-fg-tertiary")}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top 4 table */}
          {top4Data.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider mb-2">Consenso Top 4</h3>
              <div className="surface rounded-[var(--r-lg)] overflow-hidden border border-border-subtle">
                <table className="w-full text-[11px]">
                  <thead><tr className="text-fg-tertiary text-[9px] uppercase tracking-wider border-b border-border-subtle bg-elevated/50">
                    <th className="text-left p-2">Equipo</th>
                    <th className="text-center p-2">🏆</th>
                    <th className="text-center p-2">🥈</th>
                    <th className="text-center p-2">🥉</th>
                    <th className="text-center p-2">Top4</th>
                  </tr></thead>
                  <tbody>
                    {top4Data.filter(t => t.totalTop4 > 0).map((t, i) => (
                      <tr key={t.team} className={cn(i < 4 ? 'bg-tint-gold/10' : '', 'border-t border-border-subtle')}>
                        <td className="p-2 font-semibold text-fg-primary">{t.team}</td>
                        <td className="p-2 text-center"><span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", t.champion > 0 ? "bg-accent-premium/15 text-accent-premium" : "text-fg-tertiary")}>{t.champion}</span></td>
                        <td className="p-2 text-center"><span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", t.runnerUp > 0 ? "bg-accent-secondary/15 text-accent-secondary" : "text-fg-tertiary")}>{t.runnerUp}</span></td>
                        <td className="p-2 text-center"><span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", t.thirdPlace > 0 ? "bg-accent-primary/15 text-accent-primary" : "text-fg-tertiary")}>{t.thirdPlace}</span></td>
                        <td className="p-2 text-center font-bold text-fg-primary font-mono">{t.totalTop4}/10</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ORACLE vs MODELS ═══ */}
      {activeTab === 'oracle' && (
        <div className="space-y-4 animate-fade">
          {oracleLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-accent-secondary/30 border-t-accent-secondary animate-spin" />
            </div>
          ) : oraclePredictions.length === 0 ? (
            <div className="surface p-8 text-center rounded-[var(--r-lg)]">
              <p className="text-xs text-fg-secondary">🔮 Cargando predicciones ORACLE...</p>
            </div>
          ) : (
            <>
              {/* Summary card */}
              <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-premium/20">
                <h3 className="text-xs font-bold text-fg-primary mb-2 flex items-center gap-2">
                  <span>🔮</span> ORACLE vs WorldCupBench
                </h3>
                <p className="text-[11px] text-fg-secondary mb-3">
                  Comparación entre las predicciones del motor ORACLE (Poisson + Dixon-Coles + Elo + xG) y los {ALL_MODELS.length} modelos del benchmark.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-tint-gold/10 rounded-[var(--r-md)]">
                    <div className="text-lg font-bold font-mono text-accent-premium">{ALL_MODELS.length}</div>
                    <div className="text-[9px] text-fg-tertiary uppercase">Modelos</div>
                  </div>
                  <div className="text-center p-2 bg-tint-blue rounded-[var(--r-md)]">
                    <div className="text-lg font-bold font-mono text-accent-primary">128</div>
                    <div className="text-[9px] text-fg-tertiary uppercase">Predicciones</div>
                  </div>
                  <div className="text-center p-2 bg-tint-green rounded-[var(--r-md)]">
                    <div className="text-lg font-bold font-mono text-accent-emerald">v2</div>
                    <div className="text-[9px] text-fg-tertiary uppercase">Motor ORACLE</div>
                  </div>
                </div>
              </div>

              {/* Champion comparison */}
              <div>
                <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider mb-2">Comparación Campeón</h3>
                <div className="space-y-1.5">
                  {models.map((m, i) => {
                    const agrees = oracleChampion && m.champion === oracleChampion;
                    return (
                      <div key={m.name} className={cn(
                        "flex items-center gap-2 p-2.5 rounded-[var(--r-md)] border",
                        agrees ? "bg-[#052E16] border-[#166534]" : "surface border-border-subtle"
                      )}>
                        <span className="text-[10px] text-fg-tertiary w-20 truncate">{m.name}</span>
                        <span className="text-[10px] font-semibold text-fg-primary flex-1">🏆 {m.champion}</span>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", agrees ? "bg-[#166534] text-[#4ADE80]" : "bg-[#2A2D35] text-[#6B7280]")}>
                          {agrees ? '✓ Coincide' : '✗ Diferente'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ORACLE predictions summary */}
              <div>
                <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider mb-2">Predicciones ORACLE (Primeros 10)</h3>
                <div className="surface rounded-[var(--r-lg)] overflow-hidden border border-border-subtle">
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-fg-tertiary text-[9px] uppercase tracking-wider border-b border-border-subtle bg-elevated/50">
                      <th className="text-left p-2">Local</th>
                      <th className="text-center p-2">Pred</th>
                      <th className="text-center p-2">Prob</th>
                      <th className="text-right p-2">Visitante</th>
                    </tr></thead>
                    <tbody>
                      {oraclePredictions.slice(0, 10).map(p => (
                        <tr key={p.id} className="border-t border-border-subtle">
                          <td className="p-2 text-fg-primary truncate max-w-[80px]">{p.homeTeam}</td>
                          <td className="p-2 text-center font-mono font-bold text-accent-premium">{p.predictedScore ? `${p.predictedScore[0]}-${p.predictedScore[1]}` : '—'}</td>
                          <td className="p-2 text-center text-[10px] text-fg-secondary">{p.homeWinPct}%</td>
                          <td className="p-2 text-right text-fg-primary truncate max-w-[80px]">{p.awayTeam}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* About */}
      {activeTab === 'about' && (
        <div className="surface p-4 space-y-3 text-xs text-fg-secondary animate-fade border border-border-subxe">
          <h2 className="text-xs font-bold text-fg-primary">Acerca de WorldCupBench</h2>
          <p>Evalúa la capacidad de modelos de IA para predecir el Mundial 2026. Mismo prompt (v2.1), respuesta JSON.</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="surface-violet p-2.5 rounded-[var(--r-md)] text-center"><div className="text-base font-bold font-mono text-accent-secondary">{ALL_MODELS.length}</div><div className="text-[9px] text-fg-tertiary uppercase">Modelos</div></div>
            <div className="surface-blue p-2.5 rounded-[var(--r-md)] text-center"><div className="text-base font-bold font-mono text-accent-primary">72</div><div className="text-[9px] text-fg-tertiary uppercase">Partidos grupo</div></div>
            <div className="surface-gold p-2.5 rounded-[var(--r-md)] text-center"><div className="text-base font-bold font-mono text-accent-premium">32</div><div className="text-[9px] text-fg-tertiary uppercase">Eliminatorias</div></div>
            <div className="surface p-2.5 rounded-[var(--r-md)] text-center border border-border-subtle"><div className="text-base font-bold font-mono text-state-success">0.3</div><div className="text-[9px] text-fg-tertiary uppercase">Temperature</div></div>
          </div>
          <ul className="space-y-1 text-[11px]">
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-state-success shrink-0" /><strong className="text-fg-primary">Accuracy:</strong> Outcome correcto</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent-premium shrink-0" /><strong className="text-fg-primary">Exact:</strong> Goles exactos</li>
            <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0" /><strong className="text-fg-primary">Brier:</strong> Calibración</li>
          </ul>
        </div>
      )}
    </div>
  );
}
