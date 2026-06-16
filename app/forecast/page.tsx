'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  runForecast,
  type TeamOutcome,
  type ForecastOutcome,
  type ForecastProgress,
  getProbColor,
  getProbBarColor,
} from '@/lib/forecast-engine';
import { WORLD_CUP_TEAMS } from '@/lib/teams';
import type { RealMatchResult } from '@/lib/tournament-sim';

// ─── Helpers ──────────────────────────────────────────────────────────────

function getFlag(name: string): string {
  return WORLD_CUP_TEAMS.find((t) => t.name === name)?.flag || '🏳️';
}

function getCode(name: string): string {
  return WORLD_CUP_TEAMS.find((t) => t.name === name)?.code || name.slice(0, 3).toUpperCase();
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function ForecastPage() {
  const [outcome, setOutcome] = useState<ForecastOutcome | null>(null);
  const [progress, setProgress] = useState<ForecastProgress | null>(null);
  const [numSims, setNumSims] = useState(100);
  const [selectedTeam, setSelectedTeam] = useState<TeamOutcome | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'champion' | 'advance' | 'group'>('champion');
  const [realResults, setRealResults] = useState<RealMatchResult[]>([]);

  // Fetch real results on mount
  useEffect(() => {
    fetch('/api/simulate-tournament')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.results) {
          setRealResults(data.results);
        }
      })
      .catch(() => {});
  }, []);

  const handleRunForecast = useCallback(async () => {
    setIsRunning(true);
    setProgress({ phase: 'groups', message: 'Iniciando...', progress: 0 });

    try {
      const result = await runForecast(numSims, realResults, (p) => setProgress(p));
      setOutcome(result);
      setSelectedTeam(null);
    } catch (err) {
      console.error('Forecast error:', err);
      setProgress({ phase: 'done', message: 'Error en simulación', progress: 0 });
    } finally {
      setIsRunning(false);
    }
  }, [numSims, realResults]);

  // Auto-run forecast once real results are loaded
  useEffect(() => {
    if (realResults.length > 0 && !outcome && !isRunning) {
      handleRunForecast();
    }
  }, [realResults, outcome, isRunning, handleRunForecast]);

  const filteredTeams = outcome?.outcomes.filter(
    (o) => filterGroup === 'all' || o.group === filterGroup
  ) || [];

  const sortedTeams = [...filteredTeams].sort((a, b) => {
    switch (sortBy) {
      case 'champion': return b.championPct - a.championPct;
      case 'advance': return b.groupAdvances - a.groupAdvances;
      case 'group': return a.group.localeCompare(b.group) || b.championPct - a.championPct;
      default: return 0;
    }
  });

  return (
    <div className="min-h-screen bg-canvas text-fg-primary p-4 md:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="h-page text-accent-primary">
          📊 Pronóstico del Torneo
        </h1>
        <p className="text-fg-secondary mt-2">
          Simulaciones Monte Carlo — motor Dixon-Coles + Poisson + Elo + bayesiano
        </p>
      </motion.div>

      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-4xl mx-auto mb-8"
      >
        <div className="surface p-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Sim count slider */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-fg-secondary mb-2">
                Simulaciones: <span className="text-accent-primary font-bold">{numSims.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={numSims}
                onChange={(e) => setNumSims(Number(e.target.value))}
                className="w-full h-2 bg-elevated rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]"
              />
              <div className="flex justify-between text-xs text-fg-tertiary mt-1">
                <span>10</span>
                <span>500</span>
                <span>1000</span>
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={handleRunForecast}
              disabled={isRunning}
              className="px-8 py-3 bg-accent-primary text-fg-primary hover:brightness-110 disabled:bg-raised disabled:text-fg-disabled rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:scale-100 shadow-md"
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Simulando...
                </span>
              ) : (
                '▶ Ejecutar Forecast'
              )}
            </button>
          </div>

          {/* Progress bar */}
          <AnimatePresence>
            {progress && progress.phase !== 'done' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <div className="text-sm text-fg-secondary mb-1">{progress.message}</div>
                <div className="w-full bg-elevated rounded-full h-2">
                  <motion.div
                    className="bg-accent-primary h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results */}
      {outcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-7xl mx-auto"
        >
          {/* Top 8 Champions */}
          <div className="mb-8">
            <h2 className="h-section text-accent-primary mb-4 flex items-center gap-2">
              🏆 Top 8 Campeones
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {outcome.champion.map((c, i) => (
                <motion.div
                  key={c.team}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 ${
                    i === 0 ? 'surface-gold' :
                    i < 3 ? 'surface border-border-strong' : 'surface'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{c.flag}</span>
                    <span className="font-bold">{c.team}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${
                      i === 0 ? 'text-accent-premium' :
                      i === 1 ? 'text-fg-secondary' :
                      i === 2 ? 'text-state-warning' : 'text-fg-secondary'
                    }`}>
                      {c.pct.toFixed(1)}%
                    </span>
                    <span className="text-xs text-fg-tertiary">({c.wins} wins)</span>
                  </div>
                  <div className="w-full bg-elevated rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        i === 0 ? 'bg-accent-premium' :
                        i === 1 ? 'bg-fg-secondary' :
                        i === 2 ? 'bg-state-warning' : 'bg-raised'
                      }`}
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="bg-surface border border-border-strong rounded-lg px-4 py-2 text-sm"
            >
              <option value="all">Todos los grupos</option>
              {['A','B','C','D','E','F','G','H','I','J','K','L'].map(g => (
                <option key={g} value={g}>Grupo {g}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-surface border border-border-strong rounded-lg px-4 py-2 text-sm"
            >
              <option value="champion">Por campeonato</option>
              <option value="advance">Por avanzar</option>
              <option value="group">Por grupo</option>
            </select>

            <div className="text-sm text-fg-tertiary flex items-center">
              {filteredTeams.length} equipos
            </div>
          </div>

          {/* Outcomes Table */}
          <div className="surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-fg-secondary">
                    <th className="px-4 py-3 text-left sticky left-0 bg-surface">#</th>
                    <th className="px-4 py-3 text-left sticky left-8 bg-surface">Equipo</th>
                    <th className="px-4 py-3 text-center">Grupo</th>
                    <th className="px-4 py-3 text-center">🏆 Campeón</th>
                    <th className="px-4 py-3 text-center">🥈 Subcampeón</th>
                    <th className="px-4 py-3 text-center">🥉 Tercero</th>
                    <th className="px-4 py-3 text-center">Avanza</th>
                    <th className="px-4 py-3 text-center">1° Grupo</th>
                    <th className="px-4 py-3 text-center">Octavos</th>
                    <th className="px-4 py-3 text-center">Cuartos</th>
                    <th className="px-4 py-3 text-center">Semis</th>
                    <th className="px-4 py-3 text-center">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTeams.map((team, idx) => (
                    <motion.tr
                      key={team.team}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => setSelectedTeam(team)}
                      className={`border-b border-border-subtle/50 cursor-pointer transition-colors ${
                        selectedTeam?.team === team.team
                          ? 'bg-tint-blue'
                          : 'hover:bg-elevated'
                      }`}
                    >
                      <td className="px-4 py-3 text-fg-tertiary sticky left-0 bg-surface">{idx + 1}</td>
                      <td className="px-4 py-3 sticky left-8 bg-surface">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{team.flag}</span>
                          <span className="font-semibold">{team.team}</span>
                          <span className="text-xs text-fg-tertiary">({team.code})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono">{team.group}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getProbColor(team.championPct)}`}>
                          {team.championPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`${getProbColor(team.runnerUpPct)}`}>
                          {team.runnerUpPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`${getProbColor(team.thirdPct)}`}>
                          {team.thirdPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getProbColor(team.groupAdvances)}`}>
                          {team.groupAdvances.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{team.groupFirst.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">{team.roundOf32Wins.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">{team.roundOf16Wins.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">{team.quarterWins.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center">{team.semiWins.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-center font-bold">{team.championPct.toFixed(1)}%</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Team Detail */}
          <AnimatePresence>
            {selectedTeam && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-8 surface p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{selectedTeam.flag}</span>
                    <div>
                      <h3 className="h-page">{selectedTeam.team}</h3>
                      <span className="text-fg-secondary">Grupo {selectedTeam.group}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedTeam(null)}
                    className="text-fg-tertiary hover:text-fg-primary transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Probability bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="h-card text-fg-secondary mb-3">Probabilidades de Posición Final</h4>
                    <div className="space-y-3">
                      {[
                        { label: '🏆 Campeón', value: selectedTeam.championPct },
                        { label: '🥈 Subcampeón', value: selectedTeam.runnerUpPct },
                        { label: '🥉 Tercero', value: selectedTeam.thirdPct },
                        { label: '🏅 Cuarto', value: Math.max(0, 100 - selectedTeam.championPct - selectedTeam.runnerUpPct - selectedTeam.thirdPct) },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className={getProbColor(item.value)}>{item.value.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-elevated rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProbBarColor(item.value)}`}
                              style={{ width: `${Math.min(100, item.value)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="h-card text-fg-secondary mb-3">Probabilidades por Ronda</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Avanza de grupo', value: selectedTeam.groupAdvances },
                        { label: 'Gana Octavos', value: selectedTeam.roundOf32Wins },
                        { label: 'Gana Cuartos', value: selectedTeam.roundOf16Wins },
                        { label: 'Gana Semis', value: selectedTeam.quarterWins },
                        { label: 'Gana Final', value: selectedTeam.championPct },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className={getProbColor(item.value)}>{item.value.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-elevated rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProbBarColor(item.value)}`}
                              style={{ width: `${Math.min(100, item.value)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Knockout Path */}
                {selectedTeam.path.length > 0 && (
                  <div className="mt-6">
                    <h4 className="h-card text-fg-secondary mb-3">Ruta en Eliminatorias</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeam.path.map((entry, i) => (
                        <div
                          key={i}
                          className={`px-3 py-2 text-sm ${
                            entry.isPlayed
                              ? entry.result === 'W'
                                ? 'surface-green text-accent-emerald'
                                : 'surface-danger text-state-danger'
                              : 'surface border-border-strong text-fg-secondary'
                          }`}
                        >
                          <span className="text-xs text-fg-tertiary">{entry.round}</span>
                          <div className="font-semibold">
                            {entry.isPlayed ? (
                              entry.result === 'W' ? '✓' : '✗'
                            ) : (
                              <span className={getProbColor(entry.winProb)}>{entry.winProb.toFixed(0)}%</span>
                            )}
                            {' vs '}{getFlag(entry.opponent)} {entry.opponent}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Simulation info */}
                <div className="mt-6 text-xs text-fg-tertiary">
                  Basado en {outcome.simulations.toLocaleString()} simulaciones • {new Date(outcome.generatedAt).toLocaleString()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Empty state */}
      {!outcome && !isRunning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto text-center py-20"
        >
          <div className="text-6xl mb-6">🔮</div>
          <h2 className="h-page text-fg-secondary mb-4">
            Configura y ejecuta el forecast
          </h2>
          <p className="text-fg-tertiary max-w-md mx-auto">
            Selecciona el número de simulaciones y presiona &quot;Ejecutar Forecast&quot; para ver las probabilidades
            de cada equipo de avanzar, llegar a la final, o ganar el Mundial 2026.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="surface p-4">
              <div className="text-2xl mb-2">⚡</div>
              <div className="h-card text-fg-secondary">Motor Dixon-Coles</div>
              <div className="text-fg-tertiary">Modelo estadístico avanzado con ajuste por goles</div>
            </div>
            <div className="surface p-4">
              <div className="text-2xl mb-2">🔄</div>
              <div className="h-card text-fg-secondary">Circuito Bayesiano</div>
              <div className="text-fg-tertiary">Actualización dinámica con resultados reales</div>
            </div>
            <div className="surface p-4">
              <div className="text-2xl mb-2">🎯</div>
              <div className="h-card text-fg-secondary">Poisson + Elo</div>
              <div className="text-fg-tertiary">Blending de 4 modelos con pesos optimizados</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
