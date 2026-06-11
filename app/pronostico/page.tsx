'use client';

import { useState } from 'react';
import TeamSelector from '@/components/TeamSelector';
import MatchSelector from '@/components/MatchSelector';
import ResultCard from '@/components/ResultCard';
import type { Match } from '@/lib/matches';
import type { Prediction } from '@/lib/groq';

type SelectionMode = 'match' | 'manual';

export default function PronosticoPage() {
  const [mode, setMode] = useState<SelectionMode>('match');
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState('');

  const handleMatchSelect = (home: string, away: string, match: Match) => {
    setHomeTeam(home);
    setAwayTeam(away);
    setSelectedMatch(match);
    setPrediction(null);
    setError('');
  };

  const handlePredict = async () => {
    if (!homeTeam || !awayTeam) { setError('Selecciona ambos equipos'); return; }
    if (homeTeam === awayTeam) { setError('Los equipos deben ser diferentes'); return; }

    setLoading(true);
    setError('');
    setPrediction(null);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam,
          awayTeam,
          matchContext: selectedMatch
            ? {
                id: selectedMatch.id,
                group: selectedMatch.group,
                matchday: selectedMatch.matchday,
                date: selectedMatch.date,
                time: selectedMatch.time,
                venue: selectedMatch.venue,
                city: selectedMatch.city,
              }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en la predicción');
      setPrediction(data.prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
          🎯 Predecir Partido
        </h1>
        <p className="text-sm text-text-secondary">
          Selecciona dos equipos y obtén una predicción detallada
        </p>
      </div>

      {/* Selection card */}
      <div className="glass-card p-5 md:p-6 mb-8 animate-fade-in-up">
        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-5">
          <button
            onClick={() => { setMode('match'); setHomeTeam(''); setAwayTeam(''); setSelectedMatch(null); setPrediction(null); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              mode === 'match'
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            🏆 Partido del Calendario
          </button>
          <button
            onClick={() => { setMode('manual'); setHomeTeam(''); setAwayTeam(''); setSelectedMatch(null); setPrediction(null); setError(''); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-accent-blue/20 text-accent-blue'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            ⚙️ Equipos Libres
          </button>
        </div>

        {/* Match info banner */}
        {selectedMatch && (
          <div className="mb-5 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-accent-blue font-semibold uppercase tracking-wider">
                  Grupo {selectedMatch.group} · Jornada {selectedMatch.matchday}
                </span>
                <p className="text-white text-sm font-medium mt-0.5">
                  {selectedMatch.venue}, {selectedMatch.city}
                </p>
              </div>
              <button
                onClick={() => { setSelectedMatch(null); setHomeTeam(''); setAwayTeam(''); }}
                className="text-text-tertiary hover:text-white transition-colors p-1"
                aria-label="Limpiar selección"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Mode content */}
        {mode === 'match' ? (
          <MatchSelector onMatchSelect={handleMatchSelect} selectedMatchId={selectedMatch?.id} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamSelector value={homeTeam} onChange={(t) => { setHomeTeam(t); setSelectedMatch(null); setPrediction(null); }} label="🏠 Local" disabledTeam={awayTeam} />
            <TeamSelector value={awayTeam} onChange={(t) => { setAwayTeam(t); setSelectedMatch(null); setPrediction(null); }} label="✈️ Visitante" disabledTeam={homeTeam} />
          </div>
        )}

        {/* Predict button */}
        <div className="mt-6">
          <button
            onClick={handlePredict}
            disabled={loading || !homeTeam || !awayTeam}
            className="btn-premium w-full py-3.5 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2 justify-center">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analizando...
              </span>
            ) : (
              '✨ Obtener Predicción'
            )}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-accent-crimson/10 border border-accent-crimson/20 rounded-xl text-accent-crimson text-center text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Result */}
      {prediction && (
        <ResultCard prediction={prediction} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  );
}
