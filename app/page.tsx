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
    <div className="min-h-screen flex flex-col">
      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 bg-bg-primary/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-white tracking-tight">
            FORCH.i <span className="text-gradient-gold">ORACLE</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Navegación principal">
            <Link href="/bracket" className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
              🏆 Torneo
            </Link>
            <Link href="/benchmark" className="px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
              🤖 Benchmark
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-8 py-8 md:py-12">
        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
            Predictor
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gradient-gold mb-3">
            Mundial 2026
          </h2>
          <p className="text-sm text-text-secondary">
            Poisson + Elo + xG · Groq Llama 3.3 70B
          </p>
        </div>

        {/* Selection Card */}
        <div className="glass-card p-5 md:p-6 mb-8 animate-fade-in-up">
          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-5">
            <button
              onClick={() => handleModeChange('match')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'match'
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              🏆 Partido
            </button>
            <button
              onClick={() => handleModeChange('manual')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === 'manual'
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                  : 'text-text-secondary hover:text-white'
              }`}
            >
              ⚙️ Equipos
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
              <TeamSelector value={homeTeam} onChange={handleManualHome} label="🏠 Local" disabledTeam={awayTeam} />
              <TeamSelector value={awayTeam} onChange={handleManualAway} label="✈️ Visitante" disabledTeam={homeTeam} />
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
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="text-center py-8 text-xs text-text-muted">
        <p>FORCH.i © 2026 · Datos oficiales FIFA</p>
      </footer>
    </div>
  );
}
