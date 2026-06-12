'use client';

import { useState, useEffect } from 'react';
import ChampionConsensusCard from '@/components/ChampionConsensusCard';
import ConsensusTable from '@/components/ConsensusTable';
import { ALL_MODELS, getModelInfo, validate } from '@/lib/worldcup-bench-data';
import type { ModelInfo } from '@/lib/worldcup-bench-data';

export default function BenchmarkPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; modelsLoaded: number; groupMatches: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'consensus' | 'models' | 'about'>('consensus');

  useEffect(() => {
    setModels(ALL_MODELS.map((name) => getModelInfo(name)));
    setValidation(validate());
  }, []);

  const TABS = [
    { id: 'consensus' as const, label: 'Consenso' },
    { id: 'models' as const, label: 'Modelos' },
    { id: 'about' as const, label: 'Acerca de' },
  ];

  // Collect all unique champion teams for dynamic display
  const championTeams = Array.from(new Set(models.map(m => m.champion)));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-6 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-white mb-1">Multi-Model Benchmark</h1>
        <p className="text-xs sm:text-sm text-text-secondary">
          {ALL_MODELS.length} modelos AI · Prompt v2.1 · Congelado 2026-06-10
        </p>
        <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald" />
            {validation?.ok ? `${validation.modelsLoaded} cargados` : 'Cargando...'}
          </span>
          <span>·</span>
          <span>{validation?.groupMatches ?? '...'} partidos de grupo</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-6 max-w-md mx-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
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
        <div className="glass-card p-4 sm:p-6 animate-fade-in">
          <h2 className="text-sm font-bold text-white mb-4">Modelos</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-text-muted text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-2" scope="col">Modelo</th>
                  <th className="text-center py-2 px-2" scope="col">Campeón</th>
                  <th className="text-center py-2 px-2" scope="col">Sub</th>
                  <th className="text-center py-2 px-2" scope="col">3°</th>
                  <th className="text-center py-2 px-2" scope="col">4°</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.name} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-2 font-semibold text-white text-xs">{m.name}</td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="text-accent-gold font-bold text-xs">{m.champion}</span>
                    </td>
                    <td className="py-2.5 px-2 text-center text-text-secondary text-xs">{m.runnerUp}</td>
                    <td className="py-2.5 px-2 text-center text-text-secondary text-xs">{m.thirdPlace}</td>
                    <td className="py-2.5 px-2 text-center text-text-secondary text-xs">{m.fourthPlace}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Champion distribution — dynamic */}
          <div className="mt-5 p-4 bg-white/[0.03] rounded-xl">
            <h3 className="text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">Distribución de campeones</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {championTeams.map(team => {
                const count = models.filter(m => m.champion === team).length;
                return (
                  <div key={team} className="bg-white/[0.04] border border-white/[0.06] rounded-lg p-2.5 text-center">
                    <div className="text-sm font-bold text-white">{team}</div>
                    <div className="text-[10px] text-text-muted">{count}/{ALL_MODELS.length}</div>
                    <div className="text-base font-bold text-accent-gold mt-0.5">
                      {Math.round((count / ALL_MODELS.length) * 100)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="glass-card p-4 sm:p-6 space-y-3 text-xs sm:text-sm text-text-secondary animate-fade-in">
          <h2 className="text-sm font-bold text-white">Acerca de WorldCupBench</h2>
          <p>
            <strong className="text-white">WorldCupBench</strong> evalúa la capacidad de modelos de IA para predecir el Mundial 2026.
            Todos reciben el <strong className="text-white">mismo prompt</strong> (v2.1) y deben responder en JSON.
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong className="text-white">{ALL_MODELS.length} modelos</strong> con predicciones congeladas pre-torneo</li>
            <li><strong className="text-white">72 partidos</strong> de grupos + 32 eliminatorios</li>
            <li><strong className="text-white">Temperature:</strong> 0.3 (todos)</li>
            <li><strong className="text-white">Ejecución:</strong> vía OpenRouter API</li>
            <li><strong className="text-white">Congelado:</strong> 2026-06-10 ~21:00 UTC</li>
          </ul>

          <h3 className="text-xs font-bold text-white pt-2">Metodología</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li><strong className="text-white">Accuracy:</strong> Outcome correcto (H/D/A)</li>
            <li><strong className="text-white">Exact score:</strong> Goles exactos</li>
            <li><strong className="text-white">Brier score:</strong> Calibración probabilística</li>
            <li><strong className="text-white">Bracket points:</strong> Eliminatorias correctas</li>
            <li><strong className="text-white">Champion bonus:</strong> Puntos extra por campeón</li>
          </ul>

          <p className="pt-2 text-[11px] text-text-muted">
            Datos descargados el 2026-06-11. Precisión se actualiza con resultados reales del Mundial.
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-text-muted border-t border-white/[0.04] mt-8">
        <p>FORCH.i © 2026 · WorldCupBench · Datos oficiales FIFA</p>
      </footer>
    </div>
  );
}
