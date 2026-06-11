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
    setProgress('Iniciando simulaciones...');

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Predictor
          </Link>

          <h1 className="text-sm font-bold text-white">
            FORCH.i <span className="text-gradient-gold">ORACLE</span>
          </h1>

          <div className="flex items-center gap-2">
            <Link href="/benchmark" className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
              🤖 Benchmark
            </Link>
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="btn-premium text-xs px-4 py-2"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Simulando...
                </span>
              ) : '⚡ Simular'}
            </button>
          </div>
        </div>

        {/* Status */}
        {(progress || loading) && (
          <div className="max-w-7xl mx-auto px-4 md:px-8 pb-2">
            <span className="text-[11px] text-text-muted truncate animate-fade-in">
              {loading && <span className="text-accent-blue mr-1">●</span>}
              {progress}
            </span>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full">
        {/* Hero — no simulation */}
        {!bracket && !loading && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4 animate-fade-in">
            <div className="text-6xl md:text-7xl mb-6 animate-bounce-subtle">🏆</div>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-text-primary mb-2">
              Simulador del
            </h2>
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-gradient-gold mb-4">
              Mundial 2026
            </h2>
            <p className="text-text-secondary text-sm md:text-base max-w-md mb-8 leading-relaxed">
              100 simulaciones con motor Poisson + Elo + xG.
              Top 8 + bracket completo de 128 partidos.
            </p>
            <button onClick={handleSimulate} className="btn-premium text-base px-8 py-4 font-bold">
              ⚡ Simular Torneo
            </button>
            <p className="text-text-muted text-xs mt-4">~30 segundos · Se actualiza con resultados reales</p>
          </div>
        )}

        {/* Loading */}
        {loading && !bracket && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Simulando Mundial 2026</h3>
            <p className="text-sm text-text-secondary">{progress || 'Calculando...'}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Error</h3>
            <p className="text-sm text-text-secondary mb-6">{error}</p>
            <button onClick={handleSimulate} className="btn-premium">Reintentar</button>
          </div>
        )}

        {/* Results */}
        {bracket && <FixtureView bracket={bracket} top8={top8} totalSims={totalSims} />}
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-xs text-text-muted">
        <p>FORCH.i © 2026 · Datos oficiales FIFA</p>
      </footer>
    </div>
  );
}
