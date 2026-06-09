'use client';

import { useState } from 'react';
import TeamSelector from '@/components/TeamSelector';
import MatchSelector from '@/components/MatchSelector';
import ResultCard from '@/components/ResultCard';
import type { Match } from '@/lib/matches';

interface Prediction {
  homeWin: number;
  draw: number;
  awayWin: number;
  analysis: string;
}

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
      setError('Select both teams');
      return;
    }
    if (homeTeam === awayTeam) {
      setError('Teams must be different');
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
        throw new Error(data.error || 'Prediction error');
      }

      setPrediction(data.prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-forch-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-block mb-4">
            <span className="text-6xl">&#x26BD;</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            FORCH.i <span className="text-forch-gold">ORACLE</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Predicciones IA del Mundial FIFA 2026
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Llama 3.3 70B + Datos en tiempo real
          </p>
        </header>

        {/* Selector */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
              <button
                onClick={() => handleModeChange('match')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'match'
                    ? 'bg-forch-gold text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                &#x1F3C6; Select Match
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === 'manual'
                    ? 'bg-forch-gold text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                &#x2699;&#xFE0F; Choose Teams
              </button>
            </div>

            {/* Match info banner when a match is selected */}
            {selectedMatch && (
              <div className="mb-6 p-4 bg-forch-gold/10 border border-forch-gold/30 rounded-xl animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-forch-gold font-semibold uppercase tracking-wider">
                      Group {selectedMatch.group} &middot; Matchday {selectedMatch.matchday}
                    </span>
                    <p className="text-white font-bold mt-1">
                      {selectedMatch.venue}, {selectedMatch.city}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMatch(null);
                      setHomeTeam('');
                      setAwayTeam('');
                    }}
                    className="text-gray-400 hover:text-white transition-colors p-1"
                  >
                    &#x2715;
                  </button>
                </div>
              </div>
            )}

            {/* Mode Content */}
            {mode === 'match' ? (
              <MatchSelector
                onMatchSelect={handleMatchSelect}
                selectedMatchId={selectedMatch?.id}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TeamSelector
                  value={homeTeam}
                  onChange={handleManualHome}
                  label="&#x1F3E0; Home Team"
                  disabledTeam={awayTeam}
                />
                <TeamSelector
                  value={awayTeam}
                  onChange={handleManualAway}
                  label="&#x2708;&#xFE0F; Away Team"
                  disabledTeam={homeTeam}
                />
              </div>
            )}

            {/* Predict Button */}
            <div className="mt-8 text-center">
              <button
                onClick={handlePredict}
                disabled={loading || !homeTeam || !awayTeam}
                className="px-8 py-4 bg-gradient-to-r from-forch-gold to-yellow-500 text-black font-bold
                           rounded-xl text-lg hover:shadow-lg hover:shadow-forch-gold/25 transition-all
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                           active:scale-95"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  '\u{1F52E} Get Prediction'
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

          {/* Result */}
          {prediction && (
            <ResultCard
              prediction={prediction}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500 text-sm">
          <p>
            Built with <span className="text-forch-gold">FORCH.i</span> by Paulo Velasco
          </p>
          <p className="mt-1">
            Datos: API-Football + Groq Llama 3.3 + worldcup26.ir
          </p>
        </footer>
      </div>
    </main>
  );
}
