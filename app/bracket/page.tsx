'use client';

import { useState } from 'react';
import Link from 'next/link';
import BracketMatch from '@/components/BracketMatch';
import ChampionReveal from '@/components/ChampionReveal';
import SimGroupStandings from '@/components/SimGroupStandings';
import Top8Ranking from '@/components/Top8Ranking';
import type { TournamentBracket, SimulatedMatch, ChampionProbability } from '@/lib/tournament-sim';

type ViewMode = 'champion' | 'bracket' | 'groups';

function CollapsibleSection({ title, icon, children, defaultOpen = false }: {
  title: string; icon: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 bg-white/5
                   hover:bg-white/10 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <span>{icon}</span> {title}
        </span>
        <span className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && <div className="p-4 border-t border-white/10">{children}</div>}
    </div>
  );
}

export default function BracketPage() {
  const [bracket, setBracket] = useState<TournamentBracket | null>(null);
  const [top8, setTop8] = useState<ChampionProbability[]>([]);
  const [totalSims, setTotalSims] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('champion');

  const handleSimulate = async () => {
    setLoading(true);
    setError('');
    setBracket(null);
    setProgress('Iniciando simulación...');

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
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-forch-gold/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-green-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-4xl">
        {/* Nav */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">
            ← Predictor
          </Link>
          <span className="text-sm font-bold text-white">
            FORCH.i <span className="text-forch-gold">ORACLE</span>
          </span>
        </div>

        {/* ═══ HERO — No simulation yet ═══ */}
        {!bracket && !loading && (
          <div className="text-center py-20">
            <div className="text-7xl mb-6">🏆</div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
              Simulador del Mundial
            </h1>
            <p className="text-gray-400 max-w-lg mx-auto mb-8">
              100 simulaciones independientes con motor Poisson + Elo + xG.
              Top 8 de probabilidad de campeón + bracket completo.
            </p>
            <button
              onClick={handleSimulate}
              className="px-8 py-4 bg-gradient-to-r from-forch-gold to-yellow-500
                         text-black font-bold rounded-xl text-lg
                         hover:shadow-2xl hover:shadow-forch-gold/25 transition-all active:scale-95"
            >
              ⚡ Simular Torneo
            </button>
            <p className="text-gray-600 text-xs mt-3">
              ~30 segundos · Se actualiza con resultados reales
            </p>
          </div>
        )}

        {/* ═══ LOADING ═══ */}
        {loading && (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-14 w-14 border-2 border-forch-gold border-t-transparent mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Simulando Mundial 2026</h3>
            <p className="text-sm text-gray-400">{progress || 'Calculando...'}</p>
          </div>
        )}

        {/* ═══ ERROR ═══ */}
        {error && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-white mb-2">Error</h3>
            <p className="text-gray-400 mb-6 text-sm">{error}</p>
            <button onClick={handleSimulate} className="px-6 py-3 bg-forch-gold text-black font-bold rounded-xl">
              Reintentar
            </button>
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {bracket && (
          <div className="space-y-6">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <span className="text-xs text-gray-400">{progress}</span>
              <button
                onClick={handleSimulate}
                className="text-xs text-forch-gold hover:text-yellow-400 transition-colors font-medium"
              >
                ↻ Re-simular
              </button>
            </div>

            {/* View toggle */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {([
                { id: 'champion' as ViewMode, label: 'Campeón', icon: '🏆' },
                { id: 'bracket' as ViewMode, label: 'Bracket', icon: '📊' },
                { id: 'groups' as ViewMode, label: 'Grupos', icon: '📋' },
              ]).map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    viewMode === mode.id ? 'bg-forch-gold text-black' : 'text-gray-500 hover:text-white'
                  }`}
                >
                  <span className="mr-1">{mode.icon}</span>
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              ))}
            </div>

            {/* ═══ CHAMPION VIEW ═══ */}
            {viewMode === 'champion' && (
              <div className="space-y-6">
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
                {top8.length > 0 && (
                  <Top8Ranking data={top8} totalSims={totalSims} />
                )}
              </div>
            )}

            {/* ═══ BRACKET VIEW ═══ */}
            {viewMode === 'bracket' && (
              <div className="space-y-4">
                <CollapsibleSection title="La Gran Final" icon="🏆" defaultOpen>
                  <div className="max-w-sm mx-auto">
                    <BracketMatch match={bracket.final} />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Semifinales" icon="⚡" defaultOpen>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bracket.semis.map((m) => <BracketMatch key={m.id} match={m} />)}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Cuartos de Final" icon="🔥">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bracket.quarters.map((m) => <BracketMatch key={m.id} match={m} />)}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Octavos de Final" icon="⚽">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {bracket.roundOf16.map((m) => <BracketMatch key={m.id} match={m} compact />)}
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="1/16 Final" icon="🏟️">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {bracket.roundOf32.map((m) => <BracketMatch key={m.id} match={m} compact />)}
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* ═══ GROUPS VIEW ═══ */}
            {viewMode === 'groups' && (
              <SimGroupStandings groups={bracket.groups} />
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-gray-600 pt-4">
              Simulación: {new Date(bracket.simulatedAt).toLocaleString('es-BO')}
              · FORCH.i by Paulo Velasco
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
