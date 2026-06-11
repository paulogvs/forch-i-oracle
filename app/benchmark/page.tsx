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
  ssr: false, // localStorage requires browser
});

export default function BenchmarkPage() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [validation, setValidation] = useState<{ ok: boolean; modelsLoaded: number; groupMatches: number; errors: string[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'consensus' | 'models' | 'leaderboard' | 'about'>('consensus');

  useEffect(() => {
    setModels(getAllModelInfos());
    setValidation(validate());
  }, []);

  return (
    <main className="min-h-screen relative">
      <div className="bg-mesh" />

      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-wc-navy/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-sm font-bold text-white hover:text-wc-gold transition-colors">
              ← FORCH.i <span className="text-wc-gold">ORACLE</span>
            </Link>
            <span className="text-xs text-wc-silver">WorldCupBench · 10 AI Models</span>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🏆🤖</div>
            <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
              Multi-Model
              <span className="block bg-gradient-to-r from-wc-gold to-wc-amber bg-clip-text text-transparent">
                Benchmark
              </span>
            </h1>
            <p className="text-wc-silver text-sm">
              {ALL_MODELS.length} AI models · Standardized prompt v2.1 · Frozen 2026-06-10
            </p>
            <div className="flex items-center justify-center gap-4 mt-3 text-xs text-wc-silver">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {validation?.ok ? `${validation.modelsLoaded} models loaded` : 'Loading...'}
              </span>
              <span>·</span>
              <span>{validation?.groupMatches ?? '...'} group matches</span>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 max-w-lg mx-auto">
            {(['consensus', 'models', 'leaderboard', 'about'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-wc-blue text-white shadow-lg shadow-wc-blue/20'
                    : 'text-wc-silver hover:text-white'
                }`}
              >
                {tab === 'consensus' ? '🤝 Consensus' : tab === 'models' ? '🤖 Models' : tab === 'leaderboard' ? '📊 Leaderboard' : '📖 About'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'consensus' && (
            <div className="space-y-6">
              <ChampionConsensusCard />
              <ConsensusTable />
            </div>
          )}

          {activeTab === 'models' && (
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold text-white mb-4">Model Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-wc-silver text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="text-left py-2 pr-2">Model</th>
                      <th className="text-center py-2 px-2">🏆 Champion</th>
                      <th className="text-center py-2 px-2">🥈 Runner-up</th>
                      <th className="text-center py-2 px-2">🥉 3rd</th>
                      <th className="text-center py-2 px-2">4th</th>
                      <th className="text-center py-2 px-2">Tokens</th>
                      <th className="text-center py-2 px-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {models.map((m) => (
                      <tr key={m.name} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 pr-2 font-semibold text-white">{m.name}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-wc-gold font-bold">{m.champion}</span>
                        </td>
                        <td className="py-3 px-2 text-center text-wc-silver">{m.runnerUp}</td>
                        <td className="py-3 px-2 text-center text-wc-silver">{m.thirdPlace}</td>
                        <td className="py-3 px-2 text-center text-wc-silver">{m.fourthPlace}</td>
                        <td className="py-3 px-2 text-center text-wc-silver text-xs">
                          {m.totalTokens.toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-center text-wc-silver text-xs">
                          {m.costUsd > 0 ? `$${m.costUsd}` : 'free'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Champion breakdown */}
              <div className="mt-6 p-4 bg-white/[0.03] rounded-xl">
                <h3 className="text-sm font-semibold text-wc-silver mb-3">Champion distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['FRA', 'ARG', 'BRA', 'ESP'].map(team => {
                    const count = models.filter(m => m.champion === team).length;
                    return (
                      <div key={team} className="glass-card p-3 text-center" style={{ border: 'none', background: 'rgba(255,255,255,0.04)' }}>
                        <div className="text-xl font-black text-white">{team}</div>
                        <div className="text-xs text-wc-silver">{count}/{ALL_MODELS.length} models</div>
                        <div className="text-2xl font-black text-wc-gold mt-1">
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
            <LeaderboardTable />
          )}

          {activeTab === 'about' && (
            <div className="glass-card p-6 space-y-4 text-sm text-wc-silver">
              <h2 className="text-lg font-bold text-white">About WorldCupBench</h2>
              <p>
                <strong className="text-white">WorldCupBench</strong> is a standardized benchmark for evaluating
                AI models&apos; ability to predict the FIFA World Cup 2026. All models receive the
                <strong className="text-white"> exact same prompt</strong> (v2.1) with tournament data injected,
                and must output predictions in a strict JSON schema.
              </p>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-white">10 models</strong> evaluated with frozen pre-tournament predictions</li>
                <li><strong className="text-white">72 group matches</strong> + 32 knockout matches</li>
                <li><strong className="text-white">Prompt temperature:</strong> 0.3 (all models)</li>
                <li><strong className="text-white">Execution:</strong> via OpenRouter API</li>
                <li><strong className="text-white">Date frozen:</strong> 2026-06-10 ~21:00 UTC</li>
                <li><strong className="text-white">Source:</strong> <a href="https://github.com/mverab/WorldCupBench" target="_blank" rel="noopener noreferrer" className="text-wc-blue hover:underline">github.com/mverab/WorldCupBench</a></li>
              </ul>

              <h3 className="text-base font-bold text-white pt-2">Scoring Methodology</h3>
              <ul className="space-y-1 list-disc list-inside">
                <li><strong className="text-white">Accuracy:</strong> Correct outcome (home/draw/away) percentage</li>
                <li><strong className="text-white">Exact score:</strong> Both goals predicted correctly</li>
                <li><strong className="text-white">Brier score:</strong> Probabilistic calibration (lower = better)</li>
                <li><strong className="text-white">Bracket points:</strong> Correctly picking knockout winners</li>
                <li><strong className="text-white">Champion bonus:</strong> Extra points for correct champion pick</li>
              </ul>

              <p className="pt-2 text-xs">
                Data downloaded and formatted for FORCH.i ORACLE on 2026-06-11.
                Leaderboard updates automatically as real WC2026 results come in.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-wc-silver/40">
          <p>Construido con <span className="text-wc-gold">FORCH.i</span> por Paulo Velasco</p>
          <p className="mt-1">
            <Link href="/" className="text-wc-blue hover:underline">← Back to Predictor</Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function getAllModelInfos(): ModelInfo[] {
  return ALL_MODELS.map((name) => getModelInfo(name));
}
