'use client';

import { useState } from 'react';
import Link from 'next/link';
import BracketMatch from '@/components/BracketMatch';
import ChampionReveal from '@/components/ChampionReveal';
import SimGroupStandings from '@/components/SimGroupStandings';
import Top8Ranking from '@/components/Top8Ranking';
import type { TournamentBracket, SimulatedMatch, ChampionProbability } from '@/lib/tournament-sim';

type ViewMode = 'champion' | 'bracket' | 'groups' | 'all';

export default function BracketPage() {
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [top8, setTop8] = useState<ChampionProbability[]>([]);
  const [totalSims, setTotalSims] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');

  const handleSimulate = async () => {
    setLoading(true);
    setProgressMessages([]);
    setError('');
    setBracket(null);

    try {
      const res = await fetch('/api/simulate-tournament', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error en la simulación');
      }

      setBracket(data.bracket);
      setTop8(data.top8 || []);
      setTotalSims(data.totalSims || 100);
      setProgressMessages([
        `✅ Motor estadístico: Poisson + Elo + xG`,
        `✅ ${data.totalSims || 100} simulaciones ejecutadas`,
        `✅ ${data.realResultsCount || 0} resultados reales aplicados`,
        `✅ Simulación completada el ${new Date().toLocaleTimeString('es-BO')}`,
      ]);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Decorative background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-forch-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-green-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Volver al Predictor
          </Link>
          <h1 className="text-xl font-bold text-white">
            FORCH.i <span className="text-forch-gold">ORACLE</span>
          </h1>
        </div>

        {/* Hero */}
        {!bracket && !loading && (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🏆</div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Predice el Campeón del Mundo
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
              Simulación completa del Mundial FIFA 2026 — desde la fase de grupos hasta la final.
              La IA analiza cada partido y predice quién levantará la copa.
            </p>

            <button
              onClick={handleSimulate}
              className="px-10 py-5 bg-gradient-to-r from-forch-gold to-yellow-500 text-black font-bold
                         rounded-2xl text-xl hover:shadow-2xl hover:shadow-forch-gold/25 transition-all
                         active:scale-95"
            >
              ⚡ Simular Torneo Completo
            </button>

            <p className="text-gray-600 text-xs mt-4">
              Motor estadístico real: Poisson + Elo + xG · Se actualiza con resultados en vivo
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-6 animate-bounce">⚽</div>
            <h3 className="text-2xl font-bold text-white mb-4">Simulando con motor estadístico real...</h3>
            <p className="text-gray-400 mb-8">Poisson + Elo + xG calculando cada partido</p>

            {/* Loading spinner */}
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-forch-gold"></div>
            </div>

            <p className="text-gray-500 text-sm mt-4">Esto toma unos segundos (motor estadístico real, no simulación rápida)</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">❌</div>
            <h3 className="text-2xl font-bold text-white mb-2">Error en la simulación</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={handleSimulate}
              className="px-6 py-3 bg-forch-gold text-black font-bold rounded-xl hover:shadow-lg transition-all"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Results */}
        {bracket && (
          <div className="space-y-8">
            {/* Progress messages */}
            {progressMessages.length > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-lg mx-auto">
                <h3 className="text-sm font-bold text-green-400 mb-2">✅ Simulación Completada</h3>
                <ul className="space-y-1">
                  {progressMessages.map((msg, i) => (
                    <li key={i} className="text-xs text-green-300">{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex gap-2 justify-center p-1 bg-white/5 rounded-xl max-w-md mx-auto">
              {([
                { id: 'all' as ViewMode, label: 'Todo' },
                { id: 'champion' as ViewMode, label: 'Campeón' },
                { id: 'bracket' as ViewMode, label: 'Bracket' },
                { id: 'groups' as ViewMode, label: 'Grupos' },
              ]).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    viewMode === mode.id
                      ? 'bg-forch-gold text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Champion Reveal */}
            {(viewMode === 'all' || viewMode === 'champion') && (
              <section>
                <h3 className="text-center text-sm text-gray-500 uppercase tracking-widest mb-6">
                  Resultado Final
                </h3>
                <ChampionReveal
                  champion={bracket.champion}
                  championFlag={bracket.championFlag}
                  runnerUp={bracket.runnerUp}
                  runnerUpFlag={bracket.runnerUpFlag}
                  thirdPlaceTeam={bracket.thirdPlaceTeam}
                  thirdPlaceFlag={bracket.thirdPlaceFlag}
                  fourthPlaceTeam={bracket.fourthPlaceTeam}
                  fourthPlaceFlag={bracket.fourthPlaceFlag}
                />
              </section>
            )}

            {/* Top 8 Probability Ranking */}
            {(viewMode === 'all' || viewMode === 'champion') && top8.length > 0 && (
              <section>
                <h3 className="text-center text-sm text-gray-500 uppercase tracking-widest mb-6">
                  Probabilidad de Campeón
                </h3>
                <div className="max-w-2xl mx-auto">
                  <Top8Ranking data={top8} totalSims={totalSims} />
                </div>
              </section>
            )}

            {/* Final match */}
            {(viewMode === 'all' || viewMode === 'bracket') && (
              <section>
                <h3 className="text-center text-sm text-gray-500 uppercase tracking-widest mb-6">
                  La Gran Final
                </h3>
                <div className="max-w-sm mx-auto">
                  <BracketMatch match={bracket.final} />
                </div>
              </section>
            )}

            {/* Knockout bracket */}
            {(viewMode === 'all' || viewMode === 'bracket') && (
              <section>
                <h3 className="text-center text-sm text-gray-500 uppercase tracking-widest mb-6">
                  Eliminatorias
                </h3>
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-6 min-w-max">
                    {/* Semifinals */}
                    <div className="space-y-4">
                      <h4 className="text-xs text-gray-500 text-center uppercase tracking-wider mb-4">Semifinales</h4>
                      {bracket.semis.map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                      {/* Third place */}
                      <div className="pt-4">
                        <h4 className="text-xs text-gray-500 text-center uppercase tracking-wider mb-2">3° Puesto</h4>
                        <BracketMatch match={bracket.thirdPlace} />
                      </div>
                    </div>

                    {/* Quarter-finals */}
                    <div className="space-y-3">
                      <h4 className="text-xs text-gray-500 text-center uppercase tracking-wider mb-4">Cuartos de Final</h4>
                      {bracket.quarters.map((match) => (
                        <BracketMatch key={match.id} match={match} />
                      ))}
                    </div>

                    {/* Round of 16 */}
                    <div className="space-y-2">
                      <h4 className="text-xs text-gray-500 text-center uppercase tracking-wider mb-4">Octavos de Final</h4>
                      {bracket.roundOf16.map((match) => (
                        <BracketMatch key={match.id} match={match} compact />
                      ))}
                    </div>

                    {/* Round of 32 */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs text-gray-500 text-center uppercase tracking-wider mb-4">1/16 Final</h4>
                      {bracket.roundOf32.map((match) => (
                        <BracketMatch key={match.id} match={match} compact />
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Group standings */}
            {(viewMode === 'all' || viewMode === 'groups') && (
              <section>
                <h3 className="text-center text-sm text-gray-500 uppercase tracking-widest mb-6">
                  Fase de Grupos
                </h3>
                <SimGroupStandings groups={bracket.groups} />
              </section>
            )}

            {/* Timestamp */}
            <div className="text-center text-xs text-gray-600 pt-4">
              Simulación generada el {new Date(bracket.simulatedAt).toLocaleString('es-BO')}
              <br />
              Datos: API-Football + Groq Llama 3.3 · FORCH.i by Paulo Velasco
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-600 text-xs">
          <p>Construido con <span className="text-forch-gold">FORCH.i</span> por Paulo Velasco</p>
        </footer>
      </div>
    </main>
  );
}
