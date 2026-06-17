'use client';

import { useState, useMemo } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';
import { cn } from '@/lib/utils';
import { useFixture, useLiveScores, useSimulation } from '@/lib/swr/hooks';
import { WORLD_CUP_TEAMS } from '@/lib/teams';

type SubPanel = 'ahora' | 'resultados' | 'pendientes';

interface LiveMatch {
  id: string; homeTeam: string; awayTeam: string; date: string; round: string; group: string;
  realHome: number | null; realAway: number | null; isPlayed: boolean;
  predHome: number | null; predAway: number | null;
  homeScorers?: string[]; awayScorers?: string[];
  isLive?: boolean; timeElapsed?: string;
}

interface FixtureResponse { success: boolean; fixture: { id: string; predictedScore: [number, number] | null }[]; }
interface LiveResponse { success: boolean; finished: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; homeScorers?: string[]; awayScorers?: string[] }[]; live: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; timeElapsed?: string }[]; }
interface SimResponse { success: boolean; results: { matchId: string; homeScore: number; awayScore: number }[]; liveStandings: Record<string, any[]>; bracket: any; }

export default function LivePage() {
  const [subPanel, setSubPanel] = useState<SubPanel>('resultados');

  const { data: fixtureData, isLoading: fixtureLoading, error: fixtureError } = useFixture<FixtureResponse>();
  const { data: liveScoresData, isLoading: liveLoading, error: liveError } = useLiveScores<LiveResponse>();
  const { data: simData, isLoading: simLoading, error: simError } = useSimulation<SimResponse>();

  const loading = fixtureLoading && liveLoading && simLoading; // Only show global loading when ALL are loading
  const allFailed = fixtureError && liveError && simError; // Only show error when ALL fail

  const matches = useMemo(() => {
    const realResultsMap = new Map<string, { home: number; away: number }>();
    if (simData?.success && simData.results) {
      for (const r of simData.results) realResultsMap.set(r.matchId, { home: r.homeScore, away: r.awayScore });
    }

    const wc26ResultsMap = new Map<string, { home: number; away: number; homeScorers: string[]; awayScorers: string[] }>();
    if (liveScoresData?.success && liveScoresData.finished) {
      for (const m of liveScoresData.finished) {
        wc26ResultsMap.set(`${m.homeTeam}|${m.awayTeam}`, { home: m.homeScore, away: m.awayScore, homeScorers: m.homeScorers || [], awayScorers: m.awayScorers || [] });
        wc26ResultsMap.set(`${m.awayTeam}|${m.homeTeam}`, { home: m.awayScore, away: m.homeScore, homeScorers: m.awayScorers || [], awayScorers: m.homeScorers || [] });
      }
    }

    const wc26LiveMap = new Map<string, { home: number; away: number; timeElapsed: string }>();
    if (liveScoresData?.success && liveScoresData.live) {
      for (const m of liveScoresData.live) {
        if (m.timeElapsed && m.timeElapsed !== 'not started' && m.timeElapsed !== 'notstarted') {
          wc26LiveMap.set(`${m.homeTeam}|${m.awayTeam}`, { home: m.homeScore, away: m.awayScore, timeElapsed: m.timeElapsed });
        }
      }
    }

    const predMap = new Map();
    if (fixtureData?.success && fixtureData.fixture) {
      for (const m of fixtureData.fixture) predMap.set(m.id, { homeGoals: m.predictedScore?.[0] ?? null, awayGoals: m.predictedScore?.[1] ?? null });
    }

    return ALL_MATCHES.map(m => {
      const pred = predMap.get(m.id);
      let real = realResultsMap.get(m.id);
      let isLive = false; let timeElapsed = '';
      if (!real) {
        const wc26 = wc26ResultsMap.get(`${m.homeTeam}|${m.awayTeam}`);
        if (wc26) real = { home: wc26.home, away: wc26.away };
      }
      const liveMatch = wc26LiveMap.get(`${m.homeTeam}|${m.awayTeam}`);
      if (liveMatch) { isLive = true; timeElapsed = liveMatch.timeElapsed; }
      return {
        id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, date: m.date, round: m.round, group: m.group,
        realHome: real?.home ?? null, realAway: real?.away ?? null, isPlayed: real !== undefined,
        predHome: pred?.homeGoals ?? null, predAway: pred?.awayGoals ?? null,
        isLive, timeElapsed,
      };
    });
  }, [fixtureData, liveScoresData, simData]);

  // Compute standings from live-scores data (real-time, no cron dependency)
  const liveStandings = useMemo(() => {
    const standings: Record<string, any[]> = {};
    for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
      const teams = WORLD_CUP_TEAMS.filter(t => t.group === letter);
      standings[letter] = teams.map(t => ({
        name: t.name, flag: t.flag, played: 0, won: 0, drawn: 0,
        lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      }));
    }
    if (liveScoresData?.success && liveScoresData.finished) {
      for (const m of liveScoresData.finished) {
        const match = ALL_MATCHES.find(am => am.homeTeam === m.homeTeam && am.awayTeam === m.awayTeam);
        if (!match || match.round !== 'group' || !match.group) continue;
        const group = match.group;
        if (!standings[group]) continue;
        const homeTeam = standings[group].find(t => t.name === m.homeTeam);
        const awayTeam = standings[group].find(t => t.name === m.awayTeam);
        if (!homeTeam || !awayTeam) continue;
        homeTeam.played++; awayTeam.played++;
        homeTeam.gf += m.homeScore; homeTeam.ga += m.awayScore;
        awayTeam.gf += m.awayScore; awayTeam.ga += m.homeScore;
        homeTeam.gd = homeTeam.gf - homeTeam.ga;
        awayTeam.gd = awayTeam.gf - awayTeam.ga;
        if (m.homeScore > m.awayScore) { homeTeam.won++; homeTeam.points += 3; awayTeam.lost++; }
        else if (m.homeScore < m.awayScore) { awayTeam.won++; awayTeam.points += 3; homeTeam.lost++; }
        else { homeTeam.drawn++; awayTeam.drawn++; homeTeam.points += 1; awayTeam.points += 1; }
      }
    }
    for (const group of Object.keys(standings)) {
      standings[group].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    }
    return standings;
  }, [liveScoresData]);

  const liveNow = matches.filter(m => m.isLive);
  const finished = matches.filter(m => m.isPlayed && !m.isLive);
  const upcoming = matches.filter(m => !m.isPlayed && !m.isLive);

  const correctCount = finished.filter(m => {
    if (m.predHome === null || m.predAway === null || m.realHome === null || m.realAway === null) return false;
    const pw = m.predHome > m.predAway ? 'home' : m.predHome < m.predAway ? 'away' : 'draw';
    const rw = m.realHome > m.realAway ? 'home' : m.realHome < m.realAway ? 'away' : 'draw';
    return pw === rw;
  }).length;
  const accuracy = finished.length > 0 ? Math.round((correctCount / finished.length) * 100) : 0;

  const getFlag = (n: string) => getTeamByName(n)?.flag || '🏳️';

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade">
      {/* Hero */}
      <div className={cn("p-4 rounded-[var(--r-lg)]", liveNow.length > 0 ? "surface-live" : "surface-blue")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{liveNow.length > 0 ? '📡' : '📊'}</span>
            <div>
              <h1 className="text-base font-bold text-fg-primary">
                En Vivo
                {liveNow.length > 0 && <span className="live-dot inline-block w-2 h-2 rounded-full bg-accent-emerald ml-2" />}
              </h1>
              <p className="text-[10px] text-fg-tertiary">
                {liveNow.length > 0 ? `${liveNow.length} en juego` : 'Sin partidos en juego'}
              </p>
            </div>
          </div>
          {finished.length > 0 && (
            <div className={cn("px-3 py-1.5 rounded-[var(--r-md)]", accuracy >= 50 ? "bg-tint-green" : "bg-tint-red")}>
              <div className={cn("text-base font-bold font-mono", accuracy >= 50 ? "text-state-success" : "text-state-danger")}>{accuracy}%</div>
              <div className="text-[9px] text-fg-tertiary">Precisión</div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
        {([
          { id: 'ahora' as const, label: '🔴 Juego', count: liveNow.length },
          { id: 'resultados' as const, label: '✅ Resultados', count: finished.length },
          { id: 'pendientes' as const, label: '⏳ Pendiente', count: upcoming.length },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setSubPanel(tab.id)} className={cn(
            "flex-1 py-2 px-2 rounded-[var(--r-md)] text-[11px] font-semibold transition-all border text-center",
            subPanel === tab.id ? "bg-accent-primary/15 text-accent-primary border-accent-primary/30" : "text-fg-tertiary border-border-subtle"
          )}>
            <div>{tab.label}</div>
            {tab.count > 0 && <div className="text-[10px] mt-0.5 font-mono">{tab.count}</div>}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3 py-4">
          {[1,2,3].map(i => (
            <div key={i} className="surface p-3 rounded-[var(--r-lg)] animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-raised" />
                <div className="flex-1 h-4 rounded bg-raised/60" />
                <div className="h-6 w-20 rounded bg-raised/60" />
                <div className="flex-1 h-4 rounded bg-raised/60" />
                <div className="h-5 w-5 rounded-full bg-raised" />
              </div>
            </div>
          ))}
        </div>
      )}
      {allFailed && <div className="surface-danger p-4 text-center rounded-[var(--r-lg)]"><p className="text-state-danger text-sm">No se pudieron cargar los datos. Reintentando automáticamente...</p></div>}

      {/* Partial error warnings — show only when some hooks fail but not all */}
      {!loading && !allFailed && (fixtureError || liveError || simError) && (
        <div className="surface-elevated p-3 rounded-[var(--r-lg)] border border-state-warning/20 text-xs text-fg-secondary flex items-center gap-2">
          <span>⚠️</span>
          <span>Algunos datos podrían no estar disponibles. {fixtureError && 'Predicciones no cargadas. '} {liveError && 'Scores en vivo no disponibles. '} {simError && 'Resultados storificados no disponibles.'}</span>
        </div>
      )}

      {/* ═══ EN JUEGO ═══ */}
      {!loading && !allFailed && subPanel === 'ahora' && (
        liveNow.length > 0 ? (
          <div className="space-y-2">
            {liveNow.map(m => (
              <div key={m.id} className="surface-live p-3 rounded-[var(--r-lg)]">
                <div className="flex items-center gap-2 mb-1"><span className="live-dot w-1.5 h-1.5 rounded-full bg-accent-emerald" /><span className="text-[10px] font-bold text-accent-emerald uppercase">{m.timeElapsed}</span></div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 flex-1"><span className="text-base">{getFlag(m.homeTeam)}</span><span className="text-xs font-bold text-fg-primary">{m.homeTeam}</span></div>
                  <div className="px-2.5 py-1 bg-canvas/50 rounded-md"><span className="font-mono font-bold text-lg text-accent-emerald tabular-nums">{m.realHome} - {m.realAway}</span></div>
                  <div className="flex items-center gap-1.5 flex-1 justify-end"><span className="text-xs font-bold text-fg-primary">{m.awayTeam}</span><span className="text-base">{getFlag(m.awayTeam)}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="surface p-8 text-center rounded-[var(--r-lg)]"><p className="text-xs text-fg-secondary">⏳ Próximamente... Los partidos del Mundial 2026 comenzarán pronto</p></div>
        )
      )}

      {/* ═══ RESULTADOS ═══ */}
      {!loading && !allFailed && subPanel === 'resultados' && (
        finished.length > 0 ? (
          <div className="space-y-2">
            {/* Summary bar */}
            <div className="surface p-3 rounded-[var(--r-lg)]">
              <div className="flex items-center justify-between text-[11px] mb-2">
                <span className="text-fg-primary font-semibold">Precisión</span>
                <div className="flex gap-2">
                  <span className="text-state-success">{correctCount} ✓</span>
                  <span className="text-state-danger">{finished.length - correctCount} ✗</span>
                </div>
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                <div className="bg-state-success/70 rounded-l-full" style={{ width: `${accuracy}%` }} />
                <div className="bg-state-danger/70 rounded-r-full" style={{ width: `${100 - accuracy}%` }} />
              </div>
            </div>
            {/* Result rows */}
            {finished.map(m => {
              const hasPred = m.predHome !== null && m.predAway !== null;
              const pw = hasPred ? (m.predHome! > m.predAway! ? 'home' : m.predHome! < m.predAway! ? 'away' : 'draw') : null;
              const rw = m.realHome !== null && m.realAway !== null ? (m.realHome > m.realAway ? 'home' : m.realHome < m.realAway ? 'away' : 'draw') : null;
              const correct = pw && rw && pw === rw;
              const exact = hasPred && m.realHome !== null && m.realAway !== null && m.predHome === m.realHome && m.predAway === m.realAway;

              return (
                <div key={m.id} className={cn(
                  "flex items-center gap-2 p-3 rounded-[var(--r-lg)] border",
                  exact ? "bg-[var(--match-correct-bg)] border-[var(--match-correct-border)]"
                  : correct ? "bg-[var(--match-partial-bg)] border-[var(--match-partial-border)]"
                  : "bg-[var(--match-wrong-bg)] border-[var(--match-wrong-border)]"
                )}>
                  {/* Home */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-base shrink-0">{getFlag(m.homeTeam)}</span>
                    <span className={cn("text-xs truncate", rw === 'home' ? (exact ? "text-[var(--match-correct-text)] font-bold" : correct ? "text-[var(--match-correct-text)] font-bold" : "text-[var(--match-wrong-text)] font-bold") : (correct || exact ? "text-state-success/70" : "text-state-danger/70"))}>{m.homeTeam}</span>
                  </div>
                  {/* Score: Real TOP, Pred BOTTOM */}
                  <div className="shrink-0 flex flex-col items-center gap-0.5">
                    <div className={cn("px-2.5 py-0.5 rounded-[var(--r-sm)]", exact ? "bg-[var(--match-correct-score)]" : correct ? "bg-[var(--match-partial-score)]" : "bg-[var(--match-wrong-score)]")}>
                      <span className={cn("font-mono font-bold text-sm tabular-nums", exact ? "text-[var(--match-correct-text)]" : correct ? "text-state-warning" : "text-[var(--match-wrong-text)]")}>{m.realHome}-{m.realAway}</span>
                    </div>
                    {hasPred && <span className="text-[9px] text-fg-tertiary font-mono">Pred: {m.predHome}-{m.predAway}</span>}
                  </div>
                  {/* Status icon */}
                  <span className="text-xs shrink-0">{exact ? '🎯' : correct ? '✅' : '❌'}</span>
                  {/* Away */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className={cn("text-xs truncate text-right", rw === 'away' ? (exact ? "text-[var(--match-correct-text)] font-bold" : correct ? "text-[var(--match-correct-text)] font-bold" : "text-[var(--match-wrong-text)] font-bold") : (correct || exact ? "text-state-success/70" : "text-state-danger/70"))}>{m.awayTeam}</span>
                    <span className="text-base shrink-0">{getFlag(m.awayTeam)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="surface p-8 text-center rounded-[var(--r-lg)]"><p className="text-xs text-fg-secondary">📊 Los resultados aparecerán aquí cuando se jueguen los partidos</p></div>
        )
      )}

      {/* ═══ PENDIENTES ═══ */}
      {!loading && !allFailed && subPanel === 'pendientes' && (
        upcoming.length > 0 ? (
          <div className="space-y-1">
            {upcoming.slice(0, 30).map(m => {
              const hasPred = m.predHome !== null && m.predAway !== null;
              const mae = hasPred && m.realHome !== null && m.realAway !== null
                ? (Math.abs(m.predHome! - m.realHome) + Math.abs(m.predAway! - m.realAway)) / 2
                : null;
              return (
                <div key={m.id} className="flex items-center justify-between p-2.5 surface rounded-[var(--r-md)]">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-sm opacity-40 shrink-0">{getFlag(m.homeTeam)}</span>
                    <span className="text-[11px] text-fg-tertiary truncate">{m.homeTeam}</span>
                  </div>
                  {hasPred ? (
                    <div className="flex flex-col items-center px-2 shrink-0">
                      <span className="text-[11px] font-mono font-bold text-accent-primary tabular-nums">{m.predHome}-{m.predAway}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-fg-disabled font-mono px-2">vs</span>
                  )}
                  <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                    <span className="text-[11px] text-fg-tertiary truncate text-right">{m.awayTeam}</span>
                    <span className="text-sm opacity-40 shrink-0">{getFlag(m.awayTeam)}</span>
                  </div>
                </div>
              );
            })}
            {upcoming.length > 30 && <p className="text-[10px] text-fg-tertiary text-center">+{upcoming.length - 30} más</p>}
          </div>
        ) : (
          <div className="surface p-8 text-center rounded-[var(--r-lg)]"><p className="text-xs text-fg-secondary">🏆 Las tablas de posiciones se actualizarán con los primeros resultados</p></div>
        )
      )}

      {/* Group Standings */}
      {Object.keys(liveStandings).length > 0 && (
        <div className="space-y-3 mt-4 pt-4 border-t border-border-subtle">
          <h3 className="text-xs font-bold text-fg-primary">📊 Tablas de Grupos</h3>
          {Object.entries(liveStandings).map(([group, teams]) => (
            <div key={group} className="surface p-3 rounded-[var(--r-lg)]">
              <h4 className="text-[11px] font-bold text-accent-premium uppercase mb-1.5">Grupo {group}</h4>
              <table className="w-full text-[11px]">
                <thead><tr className="text-fg-tertiary text-[9px]"><th className="text-left pb-1 w-5">#</th><th className="text-left pb-1">Equipo</th><th className="text-center pb-1">PJ</th><th className="text-center pb-1">DG</th><th className="text-center pb-1">Pts</th></tr></thead>
                <tbody>{(teams as any[]).map((t: any, i: number) => (
                  <tr key={t.name} className={cn(i < 2 && t.played > 0 ? 'bg-tint-green/20' : '', 'border-t border-border-subtle')}>
                    <td className="py-1 text-fg-tertiary">{i + 1}</td>
                    <td className="py-1"><div className="flex items-center gap-1"><span className="text-sm">{getFlag(t.name)}</span><span className={cn("truncate max-w-[60px]", i < 2 && t.played > 0 ? "font-semibold text-fg-primary" : "text-fg-secondary")}>{t.name}</span></div></td>
                    <td className="py-1 text-center text-fg-tertiary">{t.played}</td>
                    <td className={cn("py-1 text-center font-mono", t.gd > 0 ? "text-state-success" : t.gd < 0 ? "text-state-danger" : "text-fg-tertiary")}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                    <td className="py-1 text-center font-bold text-fg-primary">{t.points}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
