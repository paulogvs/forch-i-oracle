'use client';

import { useState } from 'react';
import FixtureView from '@/components/FixtureView';
import type { TournamentBracket, ChampionProbability } from '@/lib/tournament-sim';

export default function TorneoPage() {
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
    <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            🏆 Simulador del Torneo
          </h1>
          <p className="text-sm text-text-secondary">
            100 simulaciones · Motor Poisson + Elo + xG · Bracket completo
          </p>
        </div>
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="btn-premium text-sm px-5 py-2.5"
        >
          {loading ? '⏳ Simulando...' : '⚡ Simular'}
        </button>
      </div>

      {/* Status bar */}
      {(progress || loading) && (
        <div className="mb-6 p-3 glass-card animate-fade-in">
          <div className="flex items-center gap-2">
            {loading && <div className="w-2 h-2 rounded-full bg-accent-blue animate-pulse" />}
            <span className="text-xs text-text-secondary">{progress}</span>
          </div>
        </div>
      )}

      {/* Hero — no simulation */}
      {!bracket && !loading && !error && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">
            Simulador del
          </h2>
          <h2 className="text-2xl md:text-4xl font-bold text-gradient-gold mb-4">
            Mundial 2026
          </h2>
          <p className="text-text-secondary text-sm md:text-base max-w-md mb-8">
            100 simulaciones con motor Poisson + Elo + xG.
            Top 8 probabilidades de campeón + bracket completo de 128 partidos.
          </p>
          <button onClick={handleSimulate} className="btn-premium gold text-base px-8 py-4 font-bold">
            ⚡ Simular Torneo Completo
          </button>
          <p className="text-text-muted text-xs mt-4">~30 segundos</p>
        </div>
      )}

      {/* Loading */}
      {loading && !bracket && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-accent-blue/30 border-t-accent-blue animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Simulando Mundial 2026</h3>
          <p className="text-sm text-text-secondary">{progress || 'Calculando...'}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-lg font-bold text-white mb-2">Error</h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md">{error}</p>
          <button onClick={handleSimulate} className="btn-premium">Reintentar</button>
        </div>
      )}

      {/* Results */}
      {bracket && <FixtureView bracket={bracket} top8={top8} totalSims={totalSims} />}
    </div>
  );
}
