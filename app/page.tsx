'use client';

import { useState } from 'react';
import Link from 'next/link';
import TeamSelector from '@/components/TeamSelector';
import MatchSelector from '@/components/MatchSelector';
import ResultCard from '@/components/ResultCard';
import type { Match } from '@/lib/matches';
import type { Prediction } from '@/lib/groq';

type SelectionMode = 'match' | 'manual';

export default function Home() {
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

  const handleManualHome = (team: string) => {
    setHomeTeam(team);
    setSelectedMatch(null);
    setPrediction(null);
  };

  const handleManualAway = (team: string) => {
    setAwayTeam(team);
    setSelectedMatch(null);
    setPrediction(null);
  };

  const handleModeChange = (newMode: SelectionMode) => {
    setMode(newMode);
    setHomeTeam('');
    setAwayTeam('');
    setSelectedMatch(null);
    setPrediction(null);
    setError('');
  };

  const handlePredict = async () => {
    if (!homeTeam || !awayTeam) {
      setError('Selecciona ambos equipos');
      return;
    }
    if (homeTeam === awayTeam) {
      setError('Los equipos deben ser diferentes');
      return;
    }

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

      if (!res.ok) {
        throw new Error(data.error || 'Error en la predicción');
      }

      setPrediction(data.prediction);
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

      <div className="relative z-10">
        {/* ═══════════════════════════════════════
            HEADER — Premium sticky
           ═══════════════════════════════════════ */}
        <header className="sticky top-0 z-50 bg-wc-navy/95 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-sm font-bold text-white">
              FORCH.i <span className="text-wc-gold">ORACLE</span>
            </h1>

            <Link
              href="/bracket"
              className="btn-premium gold text-xs px-4 py-2"
            >
              🏆 Simular Torneo
            </Link>
          </div>
        </header>

        {/* ═══════════════════════════════════════
            HERO
           ═══════════════════════════════════════ */}
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
          <div className="text-center mb-8 animate-fade-in">
            <div className="text-5xl md:text-6xl mb-4">⚽</div>
            <h2 className="text-2xl md:text-4xl font-black text-white mb-2">
              Predictor
              <span className="block bg-gradient-to-r from-wc-blue to-wc-amber bg-clip-text text-transparent">
                Mundial 2026
              </span>
            </h2>
            <p className="text-wc-silver text-sm">
              Poisson + Elo + xG · Groq Llama 3.3 70B
            </p>
          </div>

          {/* ═══════════════════════════════════════
              SELECTION CARD
             ═══════════════════════════════════════ */}
          <div className="glass-card p-5 mb-6">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-5">
              <button
                onClick={() => handleModeChange('match')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'match'
                    ? 'bg-wc-blue text-white shadow-lg shadow-wc-blue/20'
                    : 'text-wc-silver hover:text-white'
                }`}
              >
                🏆 Partido
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'manual'
                    ? 'bg-wc-blue text-white shadow-lg shadow-wc-blue/20'
                    : 'text-wc-silver hover:text-white'
                }`}
              >
                ⚙️ Equipos
              </button>
            </div>

            {/* Match info banner */}
            {selectedMatch && (
              <div className="mb-5 p-3 bg-wc-blue/10 border border-wc-blue/20 rounded-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-wc-blue font-semibold uppercase tracking-wider">
                      Grupo {selectedMatch.group} · Jornada {selectedMatch.matchday}
                    </span>
                    <p className="text-white text-sm font-medium mt-0.5">
                      {selectedMatch.venue}, {selectedMatch.city}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMatch(null);
                      setHomeTeam('');
                      setAwayTeam('');
                    }}
                    className="text-wc-silver hover:text-white transition-colors p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Mode content */}
            {mode === 'match' ? (
              <MatchSelector
                onMatchSelect={handleMatchSelect}
                selectedMatchId={selectedMatch?.id}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TeamSelector
                  value={homeTeam}
                  onChange={handleManualHome}
                  label="🏠 Local"
                  disabledTeam={awayTeam}
                />
                <TeamSelector
                  value={awayTeam}
                  onChange={handleManualAway}
                  label="✈️ Visitante"
                  disabledTeam={homeTeam}
                />
              </div>
            )}

            {/* Predict button */}
            <div className="mt-6 text-center">
              <button
                onClick={handlePredict}
                disabled={loading || !homeTeam || !awayTeam}
                className="w-full md:w-auto px-8 py-3.5 bg-gradient-to-r from-wc-blue to-wc-blue-glow text-white font-bold
                           rounded-xl text-base hover:shadow-lg hover:shadow-wc-blue/30 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                           active:scale-95"
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
                  '🔮 Obtener Predicción'
                )}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-sm">
                {error}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════
              RESULT
             ═══════════════════════════════════════ */}
          {prediction && (
            <div className="animate-slide-up">
              <ResultCard
                prediction={prediction}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-wc-silver/40">
          <p>Construido con <span className="text-wc-gold">FORCH.i</span> por Paulo Velasco</p>
        </footer>
      </div>
    </main>
  );
}
