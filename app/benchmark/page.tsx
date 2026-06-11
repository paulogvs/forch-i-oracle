'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ChampionConsensusCard from '@/components/ChampionConsensusCard';
import ConsensusTable from '@/components/ConsensusTable';
import { ALL_MODELS, getModelInfo, validate } from '@/lib/worldcup-bench-data';
import type { ModelInfo } from '@/lib/worldcup-bench-data';

const LeaderboardTable = dynamic(() => import('@/components/LeaderboardTable'), {
  loading: () => <div className="glass-card p-6"><div className="skeleton h-48 w-full" /></div>,
  ssr: false,
});

export default function BenchmarkPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; modelsLoaded: number; groupMatches: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'consensus' | 'models' | 'leaderboard' | 'about'>('consensus');

  useEffect(() => {
    setModels(ALL_MODELS.map((name) => getModelInfo(name)));
    setValidation(validate());
  }, []);

  const TABS = [
    { id: 'consensus' as const, label: 'Consenso' },
    { id: 'models' as const, label: 'Modelos' },
    { id: 'leaderboard' as const, label: 'Leaderboard' },
    { id: 'about' as const, label: 'Acerca de' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-white tracking-tight">
            FORCH.i <span className="text-gradient-gold">ORACLE</span>
          </Link>
          <span className="text-[11px] text-text-muted">WorldCupBench · 10 AI Models</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8">
        {/* Hero */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-text-primary mb-1">
            Multi-Model
          </h1>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient-gold mb-3">
            Benchmark
          </h1>
          <p className="text-sm text-text-secondary">
            {ALL_MODELS.length} AI models · Prompt v2.1 · Frozen 2026-06-10
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
              {validation?.ok ? `${validation.modelsLoaded} loaded` : 'Loading...'}
            </span>
            <span>·</span>
            <span>{validation?.groupMatches ?? '...'} group matches</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-6 max-w-lg mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'consensus' && (
          <div className="space-y-6 animate-fade-in">
            <ChampionConsensusCard />
            <ConsensusTable />
          </div>
        )}

        {activeTab === 'models' && (
          <div className="glass-card p-6 animate-fade-in">
            <h2 className="text-base font-bold text-text-primary mb-4">Modelos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                    <th className="text-left py-2 pr-2">Modelo</th>
                    <th className="text-center py-2 px-2">Campeón</th>
                    <th className="text-center py-2 px-2">Subcampeón</th>
                    <th className="text-center py-2 px-2">3°</th>
                    <th className="text-center py-2 px-2">4°</th>
                    <th className="text-center py-2 px-2">Tokens</th>
                    <th className="text-center py-2 px-2">Costo</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 pr-2 font-semibold text-text-primary">{m.name}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="text-accent-gold font-bold">{m.champion}</span>
                      </td>
                      <td className="py-3 px-2 text-center text-text-secondary">{m.runnerUp}</td>
                      <td className="py-3 px-2 text-center text-text-secondary">{m.thirdPlace}</td>
                      <td className="py-3 px-2 text-center text-text-secondary">{m.fourthPlace}</td>
                      <td className="py-3 px-2 text-center text-text-muted text-xs">
                        {m.totalTokens.toLocaleString()}
                      </td>
                      <td className="py-3 px-2 text-center text-text-muted text-xs">
                        {m.costUsd > 0 ? `$${m.costUsd}` : 'free'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Champion distribution */}
            <div className="mt-6 p-4 bg-white/[0.03] rounded-xl">
              <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Distribución de campeones</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['FRA', 'ARG', 'BRA', 'ESP'].map(team => {
                  const count = models.filter(m => m.champion === team).length;
                  return (
                    <div key={team} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-text-primary">{team}</div>
                      <div className="text-[11px] text-text-muted">{count}/{ALL_MODELS.length} models</div>
                      <div className="text-xl font-bold text-accent-gold mt-1">
                        {Math.round((count / ALL_MODELS.length) * 100)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="animate-fade-in">
            <LeaderboardTable />
          </div>
        )}

        {activeTab === 'about' && (
          <div className="glass-card p-6 space-y-4 text-sm text-text-secondary animate-fade-in">
            <h2 className="text-base font-bold text-text-primary">Acerca de WorldCupBench</h2>
            <p>
              <strong className="text-text-primary">WorldCupBench</strong> evalúa la capacidad de modelos de IA para predecir el Mundial 2026.
              Todos reciben el <strong className="text-text-primary">mismo prompt</strong> (v2.1) y deben responder en JSON.
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong className="text-text-primary">10 modelos</strong> con predicciones congeladas pre-torneo</li>
              <li><strong className="text-text-primary">72 partidos</strong> de grupos + 32 eliminatorios</li>
              <li><strong className="text-text-primary">Temperature:</strong> 0.3 (todos)</li>
              <li><strong className="text-text-primary">Ejecución:</strong> vía OpenRouter API</li>
              <li><strong className="text-text-primary">Congelado:</strong> 2026-06-10 ~21:00 UTC</li>
              <li><strong className="text-text-primary">Fuente:</strong>{' '}
                <a href="https://github.com/mverab/WorldCupBench" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">
                  github.com/mverab/WorldCupBench
                </a>
              </li>
            </ul>

            <h3 className="text-sm font-bold text-text-primary pt-2">Metodología</h3>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong className="text-text-primary">Accuracy:</strong> Outcome correcto (H/D/A)</li>
              <li><strong className="text-text-primary">Exact score:</strong> Goles exactos</li>
              <li><strong className="text-text-primary">Brier score:</strong> Calibración probabilística</li>
              <li><strong className="text-text-primary">Bracket points:</strong> Eliminatorias correctas</li>
              <li><strong className="text-text-primary">Champion bonus:</strong> Puntos extra por campeón</li>
            </ul>

            <p className="pt-2 text-[11px] text-text-muted">
              Datos descargados el 2026-06-11. Leaderboard se actualiza con resultados reales del Mundial.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-text-muted">
        <p>FORCH.i © 2026 · Datos oficiales FIFA</p>
      </footer>
    </div>
  );
}
