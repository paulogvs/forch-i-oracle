'use client';

import { useState } from 'react';
import Link from 'next/link';
import FixtureView from '@/components/FixtureView';
import type { TournamentBracket, ChampionProbability } from '@/lib/tournament-sim';

export default function BracketPage() {
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [top8, setTop8] = useState<ChampionProbability[]>([]);
  const [totalSims, setTotalSims] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    setBracket(null);
    setProgress('Iniciando 100 simulaciones...');

    try {
      const res = await fetch('/api/simulate-tournament', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error en la simulación');

      setBracket(data.bracket);
      setTop8(data.top8 || []);
      setTotalSims(data.totalSims || 100);
      setProgress(`${data.totalSims} simulaciones · ${data.realResultsCount || 0} resultados reales`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen relative">
      {/* Background mesh */}
      <div className="bg-mesh" />
      <div className="stadium-lights" />

      {/* Content */}
      <div className="relative z-10">
        {/* ═══════════════════════════════════════
            HEADER — Sticky premium
           ═══════════════════════════════════════ */}
        <header className="sticky top-0 z-50 bg-wc-navy/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <Link
                href="/"
                className="flex items-center gap-2 text-wc-silver hover:text-white transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Predictor
              </Link>

              <div className="text-center">
                <h1 className="text-sm font-bold text-white">
                  FORCH.i <span className="text-wc-gold">ORACLE</span>
                </h1>
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="btn-premium gold text-xs px-4 py-2 flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Simulando...
                  </>
                ) : (
                  <>⚡ Simular</>
                )}
              </button>
            </div>

            {/* Status bar */}
            {(progress || loading) && (
              <div className="text-xs text-wc-silver truncate animate-fade-in">
                {loading && <span className="text-wc-blue mr-1">●</span>}
                {progress}
              </div>
            )}
          </div>
        </header>

        {/* ═══════════════════════════════════════
            MAIN CONTENT
           ═══════════════════════════════════════ */}
        <div className="max-w-7xl mx-auto">
          {/* Hero — No simulation yet */}
          {!bracket && !loading && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in">
              {/* Animated trophy */}
              <div className="text-7xl md:text-8xl mb-6 animate-bounce-subtle">🏆</div>
              
              <h2 className="text-3xl md:text-5xl font-black text-white mb-3">
                Simulador del
                <span className="block bg-gradient-to-r from-wc-blue via-wc-amber to-wc-gold bg-clip-text text-transparent">
                  Mundial 2026
                </span>
              </h2>

              <p className="text-wc-silver text-sm md:text-base max-w-md mb-8 leading-relaxed">
                100 simulaciones independientes con motor Poisson + Elo + xG.
                Top 8 de probabilidad + bracket completo de 128 partidos.
              </p>

              <button
                onClick={handleSimulate}
                className="btn-premium gold text-base px-8 py-4 font-bold"
              >
                ⚡ Simular Torneo Completo
              </button>

              <p className="text-wc-silver/60 text-xs mt-4">
                ~30 segundos · Se actualiza con resultados reales
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && !bracket && (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-wc-blue/30 border-t-wc-blue animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Simulando Mundial 2026</h3>
              <p className="text-sm text-wc-silver">{progress || 'Calculando...'}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="text-5xl mb-4">❌</div>
              <h3 className="text-xl font-bold text-white mb-2">Error</h3>
              <p className="text-sm text-wc-silver mb-6">{error}</p>
              <button onClick={handleSimulate} className="btn-premium gold">
                Reintentar
              </button>
            </div>
          )}

          {/* Fixture View */}
          {bracket && (
            <FixtureView
              bracket={bracket}
              top8={top8}
              totalSims={totalSims}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="relative z-10 text-center py-8 text-xs text-wc-silver/40">
          <p>Construido con <span className="text-wc-gold">FORCH.i</span> por Paulo Velasco</p>
        </footer>
      </div>
    </main>
  );
}
