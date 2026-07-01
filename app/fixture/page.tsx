'use client';

import { useState, useMemo, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName, ELO_RATINGS, POWER_RATINGS } from '@/lib/teams';
import { utcToLocal, getUserTimezoneOffset, getTimezoneLabel, TIMEZONE_PRESETS } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import MatchSeal, { computeSealStatus } from '@/components/MatchSeal';
import DriftSparkline from '@/components/DriftSparkline';
import { AnimatedCheck, AnimatedX, AnimatedZap, AnimatedClock, AnimatedLiveDot } from '@/components/icons/animated-icons';
import { motion, AnimatePresence } from 'motion/react';
import { useFixture, useLiveScores, useSimulation, usePredictedBracket } from '@/lib/swr/hooks';
import { WORLD_CUP_TEAMS } from '@/lib/teams';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { MatchCardSkeleton, StatCardSkeleton, GroupTableSkeleton } from '@/components/Skeleton';
import { Trophy, BarChart3, Target, Zap, ChevronRight } from 'lucide-react';

type MainTab = 'partidos' | 'tablas' | 'top8' | 'bracket';
type PhaseFilter = string;
type MatchStatus = 'exact' | 'winner_ok' | 'wrong' | 'upcoming';

interface FixtureMatch {
  id: string; group: string; date: string; time: string; homeTeam: string; awayTeam: string;
  venue: string; city: string; round: string; homeGoals: number | null; awayGoals: number | null;
  actualHome: number | null; actualAway: number | null;
  homeWin: number | null; draw: number | null; awayWin: number | null; confidence: string | null;
  topScores: { home: number; away: number; probability: number }[] | null;
  isPredicted: boolean; isFinished: boolean; extraTime?: boolean; penalties?: boolean;
  analysis?: string; homeKeyPlayers?: string[]; awayKeyPlayers?: string[];
}

interface RealResult { matchId: string; homeScore: number; awayScore: number; winner: string; }

interface FixtureResponse { success: boolean; fixture: FixtureMatch[]; }
interface LiveResponse { success: boolean; finished: { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number }[]; }
interface SimResponse { success: boolean; results: { matchId: string; homeScore: number; awayScore: number; winner: string }[]; top8: any[]; bracket: any; liveStandings: Record<string, any[]>; }
interface PredictedBracketResponse { success: boolean; champion: string | null; championFlag: string; championProb: number | null; runnerUp: string | null; thirdPlace: string | null; bracket: { roundOf32: any[]; roundOf16: any[]; quarters: any[]; semis: any[]; thirdPlace: any; final: any; } | null; championPath: any[]; stats: { total: number; played: number; correct: number; exact: number; wrong: number; accuracy: number | null; }; }

export default function FixturePage() {
  const [mainTab, setMainTab] = useState<MainTab>('partidos');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [selectedMatch, setSelectedMatch] = useState<FixtureMatch | null>(null);
  const [tzOffset, setTzOffset] = useState<number>(-4);

  const { fixture: cachedFixture, bracket: cachedBracket, standings: cachedStandings, top8: cachedTop8, loading: storeLoading } = useTournamentStore();
  const { data: fixtureData, isLoading: fixtureLoading, error: fixtureError } = useFixture<FixtureResponse>();
  const { data: liveData } = useLiveScores<LiveResponse>();
  const { data: simData, isLoading: simLoading, error: simError } = useSimulation<SimResponse>();
  const { data: predBracketData } = usePredictedBracket<PredictedBracketResponse>();

  const loading = fixtureLoading && simLoading && storeLoading; // Only show global loading when ALL are loading
  const allFailed = fixtureError && simError && !cachedFixture; // Only show error when ALL fail

  useEffect(() => { setTzOffset(getUserTimezoneOffset()); }, []);

  const top8 = useMemo(() => simData?.success ? simData.top8 || [] : cachedTop8 || [], [simData, cachedTop8]);
  const bracket = useMemo(() => simData?.success ? simData.bracket : cachedBracket, [simData, cachedBracket]);

  const fixtures = useMemo(() => {
    if (!fixtureData?.success) return cachedFixture || [];
    const base = (fixtureData.fixture || []).map((m: any) => ({
      id: m.id, group: m.group || 'KO', date: m.date, time: m.time || '',
      homeTeam: m.homeTeam, awayTeam: m.awayTeam, venue: m.venue || '', city: m.city || '',
      round: m.round, homeGoals: m.predictedScore?.[0] ?? null, awayGoals: m.predictedScore?.[1] ?? null,
      actualHome: m.actualScore?.[0] ?? null, actualAway: m.actualScore?.[1] ?? null,
      homeWin: m.homeWinPct ?? null, draw: m.drawPct ?? null, awayWin: m.awayWinPct ?? null,
      confidence: m.confidence ?? null, topScores: m.topScores ?? null,
      isPredicted: m.predictedScore !== null,
      isFinished: m.actualScore != null,
      extraTime: false, penalties: false,
      analysis: m.analysis || '', homeKeyPlayers: m.homeKeyPlayers || [], awayKeyPlayers: m.awayKeyPlayers || [],
    }));

    // Override knockout match teams with consensus bracket (same source as championProbs)
    if (bracket) {
      const bracketRoundMap: Record<string, any[]> = {
        'round-32': bracket.roundOf32 || [],
        'round-16': bracket.roundOf16 || [],
        'quarter': bracket.quarters || [],
        'semi': bracket.semis || [],
        'final': bracket.final ? [bracket.final] : [],
        'third': bracket.thirdPlace ? [bracket.thirdPlace] : [],
      };
      // Track which bracket matches have been used (by position) to avoid duplicates
      const usedBracketIndices: Record<string, number> = {};
      for (const m of base) {
        const bracketMatches = bracketRoundMap[m.round];
        if (!bracketMatches || bracketMatches.length === 0) continue;
        const idx = usedBracketIndices[m.round] || 0;
        if (idx < bracketMatches.length) {
          const bMatch = bracketMatches[idx];
          if (bMatch && bMatch.homeTeam !== 'TBD') {
            m.homeTeam = bMatch.homeTeam;
            m.awayTeam = bMatch.awayTeam;
            m.homeGoals = bMatch.homeScore;
            m.awayGoals = bMatch.awayScore;
            m.homeWin = bMatch.homeWinProb;
            m.draw = bMatch.drawProb;
            m.awayWin = bMatch.awayWinProb;
            m.isPredicted = bMatch.homeScore !== null;
            m.confidence = bMatch.homeWinProb != null ? (bMatch.homeWinProb > 55 ? 'alta' : bMatch.homeWinProb > 40 ? 'media' : 'baja') : null;
          }
          usedBracketIndices[m.round] = idx + 1;
        }
      }
    }

    return base;
  }, [fixtureData, bracket, cachedFixture]);

  const realResults = useMemo(() => {
    const resultsMap = new Map<string, RealResult>();
    // 1. Source: simulation results
    if (simData?.success && simData.results) for (const r of simData.results) resultsMap.set(r.matchId, r);
    // 2. Source: fixture actualScore (single source of truth from data layer)
    for (const f of fixtures) {
      if (f.actualHome != null && f.actualAway != null) {
        const winner = f.actualHome > f.actualAway ? f.homeTeam : f.actualAway > f.actualHome ? f.awayTeam : 'draw';
        resultsMap.set(f.id, { matchId: f.id, homeScore: f.actualHome, awayScore: f.actualAway, winner });
      }
    }
    // 3. Source: live-scores (override with freshest data)
    if (liveData?.success && liveData.finished) {
      for (const m of liveData.finished) {
        const match = ALL_MATCHES.find(am => am.homeTeam === m.homeTeam && am.awayTeam === m.awayTeam);
        if (match) resultsMap.set(match.id, { matchId: match.id, homeScore: m.homeScore, awayScore: m.awayScore, winner: m.homeScore > m.awayScore ? m.homeTeam : m.awayScore > m.homeScore ? m.awayTeam : 'draw' });
      }
    }
    return resultsMap;
  }, [simData, liveData, fixtures]);

  // Compute standings from fixture actualScore + live-scores (single source of truth)
  const liveStandings = useMemo(() => {
    if (cachedStandings && Object.keys(cachedStandings).length > 0) return cachedStandings;

    const standings: Record<string, any[]> = {};
    // Initialize all groups
    for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
      const teams = WORLD_CUP_TEAMS.filter(t => t.group === letter);
      standings[letter] = teams.map(t => ({
        name: t.name, flag: t.flag, played: 0, won: 0, drawn: 0,
        lost: 0, gf: 0, ga: 0, gd: 0, points: 0,
      }));
    }

    // Helper to apply a match result to standings
    function applyResult(homeTeam: string, awayTeam: string, homeScore: number, awayScore: number) {
      const match = ALL_MATCHES.find(am => am.homeTeam === homeTeam && am.awayTeam === awayTeam);
      if (!match || match.round !== 'group' || !match.group) return;
      const group = match.group;
      if (!standings[group]) return;
      const ht = standings[group].find(t => t.name === homeTeam);
      const at = standings[group].find(t => t.name === awayTeam);
      if (!ht || !at) return;
      ht.played++; at.played++;
      ht.gf += homeScore; ht.ga += awayScore;
      at.gf += awayScore; at.ga += homeScore;
      ht.gd = ht.gf - ht.ga;
      at.gd = at.gf - at.ga;
      if (homeScore > awayScore) { ht.won++; ht.points += 3; at.lost++; }
      else if (homeScore < awayScore) { at.won++; at.points += 3; ht.lost++; }
      else { ht.drawn++; at.drawn++; ht.points += 1; at.points += 1; }
    }

    // 1. Source: fixture actualScore (single source of truth)
    const processedMatchIds = new Set<string>();
    for (const f of fixtures) {
      if (f.actualHome != null && f.actualAway != null && f.round === 'group') {
        applyResult(f.homeTeam, f.awayTeam, f.actualHome, f.actualAway);
        processedMatchIds.add(f.id);
      }
    }

    // 2. Source: live-scores (override/add with freshest data)
    if (liveData?.success && liveData.finished) {
      for (const m of liveData.finished) {
        const match = ALL_MATCHES.find(am => am.homeTeam === m.homeTeam && am.awayTeam === m.awayTeam);
        if (match && !processedMatchIds.has(match.id)) {
          applyResult(m.homeTeam, m.awayTeam, m.homeScore, m.awayScore);
        }
      }
    }

    // Sort each group by points, then GD, then GF
    for (const group of Object.keys(standings)) {
      standings[group].sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    }
    return standings;
  }, [liveData, cachedStandings, fixtures]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { if (fixtureData || simData) setLastUpdated(new Date()); }, [fixtureData, simData]);

  const MAIN_TABS = [
    { id: 'partidos' as const, label: 'Partidos', icon: Target },
    { id: 'tablas' as const, label: 'Tablas', icon: BarChart3 },
    { id: 'top8' as const, label: 'Top 8', icon: Trophy },
    { id: 'bracket' as const, label: 'Bracket', icon: ChevronRight },
  ];
  const PHASES = [
    { id: 'all', label: 'Todos' }, { id: 'group', label: 'Grupos' },
    { id: 'round-32', label: '1/16' }, { id: 'round-16', label: '1/8' },
    { id: 'quarter', label: '1/4' }, { id: 'semi', label: 'Semis' }, { id: 'final', label: 'Final' },
  ];

  const filtered = phaseFilter === 'all' ? fixtures : fixtures.filter(m => m.round === phaseFilter);
  const getRoundLabel = (r: string) => ({ group:'Fase de Grupos','round-32':'1/16 Final','round-16':'Octavos',quarter:'Cuartos',semi:'Semifinales',third:'Tercer Puesto',final:'Final' }[r] || r);
  const getFlag = (n: string) => getTeamByName(n)?.flag || '🏳️';
  const predictedCount = fixtures.filter(f => f.isPredicted).length;
  const playedCount = realResults.size;

  let correctCount = 0, exactCount = 0;
  realResults.forEach((result, matchId) => {
    const fix = fixtures.find(f => f.id === matchId);
    if (!fix || fix.homeGoals === null) return;
    const pw = (fix.homeGoals ?? 0) > (fix.awayGoals ?? 0) ? 'home' : (fix.homeGoals ?? 0) < (fix.awayGoals ?? 0) ? 'away' : 'draw';
    const rw = result.homeScore > result.awayScore ? 'home' : result.homeScore < result.awayScore ? 'away' : 'draw';
    if (pw === rw) correctCount++;
    if (fix.homeGoals !== null && fix.awayGoals !== null && fix.homeGoals === result.homeScore && fix.awayGoals === result.awayScore) exactCount++;
  });

  const groupedByDate = (() => {
    const groups = filtered.reduce<Record<string, FixtureMatch[]>>((acc, m) => {
      const local = utcToLocal(m.date, m.time || '00:00');
      if (!acc[local.date]) acc[local.date] = [];
      acc[local.date].push({ ...m, time: local.time }); return acc;
    }, {});
    // Sort each date group by time (chronological within each day)
    for (const date of Object.keys(groups)) {
      groups[date].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
    }
    // Sort date groups chronologically
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    const sorted: Record<string, FixtureMatch[]> = {};
    for (const key of sortedKeys) sorted[key] = groups[key];
    return sorted;
  })();
  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  // ─── Next 4 upcoming matches (not finished, nearest first) ───
  const upcoming4 = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    return fixtures
      .filter(m => !m.isFinished && m.isPredicted)
      .filter(m => {
        const matchDate = new Date(`${m.date}T${m.time || '00:00'}:00Z`);
        return matchDate >= todayStart;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time || '').localeCompare(b.time || '');
      })
      .slice(0, 4);
  }, [fixtures]);

  // Compute match status
  function getMatchStatus(match: FixtureMatch, result?: RealResult): MatchStatus {
    // Use actualScore from fixture as source of truth
    if (match.isFinished && match.actualHome != null && match.actualAway != null) {
      if (match.homeGoals === null || match.awayGoals === null) return 'upcoming';
      const pw = match.homeGoals > match.awayGoals ? 'home' : match.homeGoals < match.awayGoals ? 'away' : 'draw';
      const rw = match.actualHome > match.actualAway ? 'home' : match.actualHome < match.actualAway ? 'away' : 'draw';
      if (match.homeGoals === match.actualHome && match.awayGoals === match.actualAway) return 'exact';
      if (pw === rw) return 'winner_ok';
      return 'wrong';
    }
    // Fallback to live-scores result
    if (!result) return 'upcoming';
    if (match.homeGoals === null || match.awayGoals === null) return 'upcoming';
    const pw = match.homeGoals > match.awayGoals ? 'home' : match.homeGoals < match.awayGoals ? 'away' : 'draw';
    const rw = result.homeScore > result.awayScore ? 'home' : result.homeScore < result.awayScore ? 'away' : 'draw';
    if (match.homeGoals === result.homeScore && match.awayGoals === result.awayScore) return 'exact';
    if (pw === rw) return 'winner_ok';
    return 'wrong';
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5 animate-fade">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-fg-primary flex items-center gap-2">⚡ Mundial 2026</h1>
            <p className="text-[11px] text-fg-secondary mt-0.5">
              {predictedCount} pred · <span className="text-state-success">{correctCount} ✓</span> · <span className="text-accent-premium">{exactCount} 🎯</span> · {playedCount} jugados
            </p>
          </div>
          <span className="text-[10px] text-fg-tertiary shrink-0">{lastUpdated ? lastUpdated.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-elevated rounded-[var(--r-xl)] mb-4 border border-border-subtle relative">
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[var(--r-lg)] text-xs font-semibold relative z-10 transition-colors duration-200",
            mainTab === t.id ? "text-white" : "text-fg-secondary hover:text-fg-primary"
          )}>
            {mainTab === t.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-accent-primary rounded-[var(--r-lg)] shadow-lg shadow-accent-primary/25"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <t.icon className="w-4 h-4" /><span className="hidden sm:inline">{t.label}</span>
            </span>
          </button>
        ))}
      </div>

      {mainTab === 'partidos' && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PHASES.map(p => (
            <button key={p.id} onClick={() => setPhaseFilter(p.id)} className={cn(
              "px-3 py-1 rounded-full text-[11px] font-semibold transition-all border",
              phaseFilter === p.id ? "bg-accent-secondary/15 text-accent-secondary border-accent-secondary/30" : "text-fg-tertiary border-border-subtle hover:text-fg-secondary"
            )}>{p.label}</button>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2 animate-fade">
          {[1,2,3,4].map(i => <MatchCardSkeleton key={i} />)}
        </div>
      )}
      {allFailed && <div className="surface-danger p-5 text-center rounded-[var(--r-lg)]"><p className="text-state-danger text-sm">Error cargando datos. Reintentando...</p></div>}
      {!loading && !allFailed && (fixtureError || simError) && (
        <div className="surface-elevated p-3 rounded-[var(--r-lg)] border border-state-warning/20 text-xs text-fg-secondary flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-state-warning shrink-0" />
          <span>Algunos datos podrían no estar disponibles. {fixtureError && 'Predicciones no cargadas. '} {simError && 'Resultados storificados no disponibles.'}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
      {/* PARTIDOS */}
      {!loading && !allFailed && mainTab === 'partidos' && (
        <motion.div
          key="partidos"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-5"
        >
          {/* Champion banner — only shown when filtering final/semi phase */}
          {(phaseFilter === 'final' || phaseFilter === 'semi') && bracket?.champion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[var(--match-gold-bg)] via-surface to-[var(--match-gold-bg)] border border-[var(--match-gold-border)]/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent-premium/5 to-transparent pointer-events-none" />
              <div className="relative text-center">
                <div className="text-3xl mb-1 animate-bounce">🏆</div>
                <div className="text-xs text-[var(--match-gold-border)] uppercase tracking-[0.15em] font-semibold mb-1">
                  Campeón Proyectado
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl">{getFlag(bracket.champion)}</span>
                  <span className="text-xl font-black text-accent-premium">{bracket.champion}</span>
                </div>
                {(bracket.runnerUp || bracket.thirdPlaceTeam) && (
                  <div className="mt-2 flex items-center justify-center gap-3 text-[11px] flex-wrap">
                    {bracket.runnerUp && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-overlay text-fg-secondary font-semibold border border-border-subtle">
                        <span>{getFlag(bracket.runnerUp)}</span>
                        <span>🥈 {bracket.runnerUp}</span>
                      </span>
                    )}
                    {bracket.thirdPlaceTeam && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-overlay text-fg-secondary font-semibold border border-border-subtle">
                        <span>{getFlag(bracket.thirdPlaceTeam)}</span>
                        <span>🥉 {bracket.thirdPlaceTeam}</span>
                      </span>
                    )}
                  </div>
                )}
                <div className="text-[9px] text-fg-tertiary mt-2">
                  100 simulaciones Monte Carlo · Fuente única de verdad
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Próximos 4 Partidos — quick glance at upcoming predictions ─── */}
          {phaseFilter === 'all' && upcoming4.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider flex items-center gap-2">
                <span className="animate-pulse">⏱</span> Próximos Partidos
              </h3>
              <div className="space-y-2">
                {upcoming4.map(match => {
                  const result = realResults.get(match.id);
                  const status = getMatchStatus(match, result);
                  return (
                    <MatchCard key={match.id} match={match} result={result} status={status} getFlag={getFlag} getRoundLabel={getRoundLabel} onClick={() => setSelectedMatch(match)} />
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ─── Historial — chronological order (oldest first) ─── */}
          {Object.entries(groupedByDate).map(([date, matches]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider">{formatDate(date)}</h3>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
              <div className="space-y-2">
                <AnimatePresence>
                  {matches.map(match => {
                    const result = realResults.get(match.id);
                    const status = getMatchStatus(match, result);
                    return (
                      <motion.div
                        key={match.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <MatchCard match={match} result={result} status={status} getFlag={getFlag} getRoundLabel={getRoundLabel} onClick={() => setSelectedMatch(match)} />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </motion.div>
      )}


      {!loading && !allFailed && mainTab === 'tablas' && (
        <motion.div key="tablas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          <TablasTab liveStandings={liveStandings} getFlag={getFlag} />
        </motion.div>
      )}
      {!loading && !allFailed && mainTab === 'top8' && (
        <motion.div key="top8" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          <Top8Tab top8={top8} getFlag={getFlag} />
        </motion.div>
      )}
      {!loading && !allFailed && mainTab === 'bracket' && (predBracketData?.bracket || bracket) && (
        <motion.div key="bracket" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
          <BracketTab
            bracket={predBracketData?.bracket || bracket}
            legacyBracket={bracket}
            championPath={predBracketData?.championPath || []}
            champion={predBracketData?.champion || bracket?.champion || null}
            championFlag={predBracketData?.championFlag || bracket?.championFlag || ''}
            championProb={predBracketData?.championProb ?? null}
            stats={predBracketData?.stats || null}
            getFlag={getFlag}
          />
        </motion.div>
      )}

      </AnimatePresence>

      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} realResult={realResults.get(selectedMatch.id)} status={getMatchStatus(selectedMatch, realResults.get(selectedMatch.id))} getFlag={getFlag} getRoundLabel={getRoundLabel} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COLOR PALETTES BY STATUS
// ═══════════════════════════════════════════════════════════════
const PALETTES: Record<string, any> = {
  upcoming: {
    card: 'bg-[var(--match-card-scheduled)] border-border-subtle',
    scoreBg: 'bg-raised',
    scoreText: 'text-fg-tertiary',
    predText: 'text-fg-secondary',
    teamText: 'text-fg-secondary',
    teamWinner: 'text-fg-secondary',
    icon: <AnimatedClock className="text-fg-tertiary" size={14} />,
  },
  exact: {
    card: 'bg-[var(--match-correct-bg)] border-[var(--match-correct-border)]',
    scoreBg: 'bg-[var(--match-correct-score)]',
    scoreText: 'text-[var(--match-correct-text)]',
    predText: 'text-state-success/80',
    teamText: 'text-state-success/70',
    teamWinner: 'text-[var(--match-correct-text)]',
    icon: <AnimatedCheck className="text-[var(--match-correct-text)]" size={16} />,
  },
  winner_ok: {
    card: 'bg-[var(--match-partial-bg)] border-[var(--match-partial-border)]',
    scoreBg: 'bg-[var(--match-partial-score)]',
    scoreText: 'text-state-warning',
    predText: 'text-state-success/80',
    teamText: 'text-state-success/70',
    teamWinner: 'text-[var(--match-correct-text)]',
    icon: <AnimatedCheck className="text-[var(--match-correct-text)]" size={16} />,
  },
  wrong: {
    card: 'bg-[var(--match-wrong-bg)] border-[var(--match-wrong-border)]',
    scoreBg: 'bg-[var(--match-wrong-score)]',
    scoreText: 'text-[var(--match-wrong-text)]',
    predText: 'text-[var(--match-wrong-text)]',
    teamText: 'text-state-danger/70',
    teamWinner: 'text-[var(--match-wrong-text)]',
    icon: <AnimatedX className="text-[var(--match-wrong-text)]" size={16} />,
  },
};

// ═══════════════════════════════════════════════════════════════
// MATCH CARD — Real score TOP, Predicted BOTTOM, TBD for unplayed
// ═══════════════════════════════════════════════════════════════
function MatchCard({ match, result, status, getFlag, getRoundLabel, onClick }: {
  match: FixtureMatch; result?: RealResult; status: MatchStatus;
  getFlag: (n: string) => string; getRoundLabel: (r: string) => string; onClick: () => void;
}) {
  const pal = PALETTES[status];
  const isPlayed = status !== 'upcoming';
  // Use fixture actualScore as source of truth, fallback to live-scores result
  const actualScore = match.isFinished && match.actualHome != null && match.actualAway != null
    ? { homeScore: match.actualHome, awayScore: match.actualAway }
    : result;
  const realWinner = actualScore ? (actualScore.homeScore > actualScore.awayScore ? 'home' : actualScore.homeScore < actualScore.awayScore ? 'away' : 'draw') : null;

  return (
    <button onClick={onClick} className={cn("w-full text-left px-4 py-3 rounded-[var(--r-lg)] border transition-all hover:brightness-110", pal.card)}>
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-1.5 w-[36%] min-w-0">
          <span className="text-lg shrink-0">{getFlag(match.homeTeam)}</span>
          <span className={cn("text-sm truncate", isPlayed && realWinner === 'home' ? pal.teamWinner : pal.teamText)}>{match.homeTeam}</span>
        </div>

        {/* Score Block — Vertical layout: REAL top, PRED bottom */}
        <div className="shrink-0 flex flex-col items-center gap-0.5">
          {/* REAL SCORE or TBD */}
          {isPlayed && actualScore ? (
            <div className={cn("px-3 py-1 rounded-[var(--r-md)]", pal.scoreBg)}>
              <span className={cn("font-mono font-bold text-base tabular-nums", pal.scoreText)}>
                {actualScore.homeScore} - {actualScore.awayScore}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-[var(--r-md)] bg-raised">
              <span className="font-mono font-bold text-base tabular-nums text-fg-disabled">TBD</span>
            </div>
          )}
          {/* PREDICTED SCORE — smaller, below */}
          {match.homeGoals !== null && match.awayGoals !== null ? (
            <span className={cn("text-[10px] font-mono tabular-nums", pal.predText)}>
              {isPlayed ? `Pred: ${match.homeGoals}-${match.awayGoals}` : `${match.homeGoals}-${match.awayGoals}`}
            </span>
          ) : null}
        </div>

        {/* Status icon */}
        <span className="shrink-0">{pal.icon}</span>

        {/* Away */}
        <div className="flex items-center gap-1.5 w-[36%] min-w-0 justify-end">
          <span className={cn("text-sm truncate text-right", isPlayed && realWinner === 'away' ? pal.teamWinner : pal.teamText)}>{match.awayTeam}</span>
          <span className="text-lg shrink-0">{getFlag(match.awayTeam)}</span>
        </div>
      </div>

      {/* Sub-info */}
      <div className="flex items-center justify-between mt-1.5 px-1">
        <span className="text-[10px] text-fg-tertiary/60">
          {match.round === 'group' ? `Gr ${match.group}` : getRoundLabel(match.round)} · {match.time}
        </span>
        {isPlayed && (
          <span className={cn("text-[10px] font-semibold", pal.scoreText)}>
            {status === 'exact' ? 'Score exacto' : status === 'winner_ok' ? 'Ganador OK' : 'Falló'}
          </span>
        )}
        {!isPlayed && match.confidence && (
          <span className="text-[10px] text-fg-tertiary flex items-center gap-1">
            <AnimatedZap size={10} className="text-fg-secondary" />
            {match.confidence}
          </span>
        )}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-TABS (compact)
// ═══════════════════════════════════════════════════════════════
function TablasTab({ liveStandings, getFlag }: { liveStandings: Record<string, any[]>; getFlag: (n: string) => string }) {
  const hasGroups = Object.keys(liveStandings).length > 0;
  if (!hasGroups) return <div className="p-8 text-center rounded-[var(--r-lg)] bg-[var(--match-card-scheduled)] border border-border-subtle"><p className="text-xs text-fg-tertiary">🏆 Las tablas de posiciones se cargarán pronto</p></div>;

  // Check if any match has been played
  const hasResults = Object.values(liveStandings).some((g: any) => g.some((t: any) => t.played > 0));

  return (
    <div className="space-y-3">
      {!hasResults && (
        <div className="p-3 text-center rounded-[var(--r-lg)] bg-[var(--match-gold-bg)] border border-[var(--match-gold-border)]">
          <p className="text-[11px] text-accent-premium">⚽ Fase de grupos — Los resultados actualizarán estas tablas</p>
        </div>
      )}
      {Object.entries(liveStandings).map(([group, teams]) => (
        <div key={group} className="p-4 rounded-[var(--r-lg)] bg-[var(--match-standings-bg)] border border-[var(--match-standings-border)]">
          <h4 className="text-xs font-bold text-accent-premium uppercase mb-2">Grupo {group}</h4>
          <table className="w-full text-xs">
            <thead><tr className="text-fg-tertiary text-[10px]"><th className="text-left pb-1.5 w-5">#</th><th className="text-left pb-1.5">Equipo</th><th className="text-center pb-1.5">PJ</th><th className="text-center pb-1.5">DG</th><th className="text-center pb-1.5">Pts</th></tr></thead>
            <tbody>{(teams as any[]).map((t: any, i: number) => (
              <tr key={t.name} className={cn(i < 2 && t.played > 0 ? 'bg-[var(--match-correct-bg)]/50' : '', 'border-t border-[var(--match-standings-border)]')}>
                <td className="py-1.5 text-fg-tertiary">{i + 1}</td>
                <td className="py-1.5"><div className="flex items-center gap-1.5"><span className="text-sm">{getFlag(t.name)}</span><span className={cn("truncate max-w-[70px]", i < 2 && t.played > 0 ? "font-semibold text-state-success/70" : "text-fg-secondary")}>{t.name}</span></div></td>
                <td className="py-1.5 text-center text-fg-tertiary">{t.played}</td>
                <td className={cn("py-1.5 text-center font-mono text-[11px]", t.gd > 0 ? "text-[var(--match-correct-text)]" : t.gd < 0 ? "text-[var(--match-wrong-text)]" : "text-fg-tertiary")}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                <td className="py-1.5 text-center font-bold text-fg-primary">{t.points}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function Top8Tab({ top8, getFlag }: { top8: any[]; getFlag: (n: string) => string }) {
  if (!top8?.length) return <div className="p-8 text-center rounded-[var(--r-lg)] bg-[var(--match-card-scheduled)] border border-border-subtle"><p className="text-xs text-fg-tertiary">🏆 Top 8 se calculará con las simulaciones del torneo</p></div>;
  return (
    <div className="space-y-2">
      {top8.slice(0, 8).map((team: any, i: number) => (
        <div key={team.name || team} className={cn("flex items-center gap-3 p-3 rounded-[var(--r-lg)] border", i < 4 ? "bg-[var(--match-gold-bg)] border-[var(--match-gold-border)]" : "bg-[var(--match-card-scheduled)] border-border-subtle")}>
          <span className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0", i === 0 ? "bg-[var(--match-gold-border)]/30 text-accent-premium" : "bg-raised text-fg-tertiary")}>{i + 1}</span>
          <span className="text-lg shrink-0">{getFlag(team.name || team)}</span>
          <span className="text-sm font-bold text-fg-primary flex-1">{team.name || team}</span>
          {team.probability !== undefined && <span className="text-[10px] text-fg-tertiary font-mono">{team.probability}%</span>}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHAMPION PATH — "Camino al campeón" (Phase 4)
// ═══════════════════════════════════════════════════════════════
function ChampionPathBanner({ championPath, champion, championFlag, championProb, getFlag }: {
  championPath: any[]; champion: string | null; championFlag: string; championProb: number | null; getFlag: (n: string) => string;
}) {
  if (!champion || championPath.length === 0) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-premium/10 via-surface to-accent-premium/5 border border-accent-premium/20">
      <div className="p-4 sm:p-5">
        {/* Champion header */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{championFlag || '🏆'}</span>
          <div>
            <div className="text-xl font-black text-accent-premium">{champion}</div>
            <div className="text-[10px] text-fg-tertiary flex items-center gap-2">
              <span>Campeón proyectado</span>
              {championProb != null && (
                <span className="px-1.5 py-0.5 rounded-md bg-accent-premium/15 text-accent-premium font-bold text-[9px]">
                  {championProb}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Path steps */}
        <div className="flex items-center gap-0.5 overflow-x-auto pb-1 scrollbar-none">
          {championPath.map((step, i) => (
            <div key={step.round} className="flex items-center gap-0.5 shrink-0">
              {/* Connector arrow between steps */}
              {i > 0 && (
                <svg className="w-4 h-4 text-fg-tertiary/40 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              )}
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] min-w-0",
                step.isPlayed
                  ? 'bg-surface/80 border-border-subtle'
                  : 'bg-[var(--match-card-scheduled)]/60 border-border-subtle/40',
              )}>
                <span className="text-fg-tertiary font-semibold shrink-0 w-[2.2rem] text-right">{step.label}</span>
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-xs shrink-0">{getFlag(step.opponent)}</span>
                  <span className="text-fg-secondary truncate max-w-[4rem]">{step.opponent}</span>
                </div>
                <div className="flex flex-col items-center leading-tight shrink-0">
                  {/* Predicted score */}
                  <span className="font-mono font-bold text-fg-primary text-[11px]">
                    {step.championPredictedScore}-{step.opponentPredictedScore}
                  </span>
                  {/* Actual score if played */}
                  {step.isPlayed && step.actualChampionScore != null && (
                    <span className={cn(
                      "font-mono text-[9px]",
                      step.actualChampionScore > step.actualOpponentScore!
                        ? 'text-state-success'
                        : 'text-state-danger',
                    )}>
                      Real: {step.actualChampionScore}-{step.actualOpponentScore}
                    </span>
                  )}
                </div>
                {/* Status indicator */}
                {step.isPlayed && (
                  step.actualChampionScore! > step.actualOpponentScore!
                    ? <span className="text-state-success shrink-0">✓</span>
                    : <span className="text-state-danger shrink-0">✗</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED BRACKET TAB (Phase 2 + 3)
// ═══════════════════════════════════════════════════════════════
function BracketTab({ bracket, legacyBracket, championPath, champion, championFlag, championProb, stats, getFlag }: {
  bracket: any; legacyBracket: any; championPath: any[]; champion: string | null;
  championFlag: string; championProb: number | null; stats: any; getFlag: (n: string) => string;
}) {
  if (!bracket && !legacyBracket) return (
    <div className="p-8 text-center rounded-[var(--r-lg)] bg-[var(--match-card-scheduled)] border border-border-subtle">
      <p className="text-xs text-fg-tertiary">📐 El bracket se generará con las simulaciones del torneo</p>
    </div>
  );

  // Use predicted bracket data if available, otherwise fall back to sim bracket
  const bracketData = bracket || legacyBracket;

  return (
    <div className="space-y-5">
      {/* Phase 4: Champion Path */}
      <ChampionPathBanner
        championPath={championPath}
        champion={champion}
        championFlag={championFlag}
        championProb={championProb}
        getFlag={getFlag}
      />

      {/* Accuracy stats bar */}
      {stats && stats.played > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--match-card-scheduled)]/60 border border-border-subtle text-[10px]">
          <span className="text-fg-secondary font-semibold">Precisión Bracket:</span>
          <span className="text-state-success font-bold">{stats.correct}/{stats.played}</span>
          <span className="text-fg-tertiary">({stats.accuracy != null ? `${stats.accuracy}%` : '—'})</span>
          <span className="text-accent-premium font-mono">{stats.exact} 🎯</span>
          <span className="text-state-danger font-mono">{stats.wrong} ✗</span>
          <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-gradient-to-r from-state-success to-accent-premium rounded-full transition-all" style={{ width: `${stats.accuracy || 0}%` }} />
          </div>
        </div>
      )}

      {/* Champion reveal */}
      {champion && (
        <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-[var(--match-gold-bg)] via-surface to-[var(--match-gold-bg)] border border-[var(--match-gold-border)]/50">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-premium/5 to-transparent pointer-events-none" />
          <div className="relative text-center">
            <div className="text-4xl mb-1 animate-bounce">{championFlag || '🏆'}</div>
            <div className="text-xl font-black text-accent-premium tracking-wide">{champion}</div>
            <div className="text-[10px] text-[var(--match-gold-border)] uppercase tracking-[0.2em] mt-1">Campeón Mundial 2026</div>
            {championProb != null && (
              <div className="mt-1 text-[10px] text-accent-premium/80">{championProb}% de probabilidad</div>
            )}
          </div>
        </div>
      )}

      {/* Bracket rounds — visual flow */}
      <div className="space-y-4">
        {bracketData.roundOf32?.length > 0 && (
          <BracketRoundAesthetic
            title="1/16 Final" subtitle="32 equipos"
            matches={bracketData.roundOf32}
            getFlag={getFlag}
            roundColor="from-accent-primary/20 to-accent-secondary/10"
          />
        )}
        {bracketData.roundOf16?.length > 0 && (
          <BracketRoundAesthetic
            title="Octavos de Final" subtitle="16 equipos"
            matches={bracketData.roundOf16}
            getFlag={getFlag}
            roundColor="from-accent-secondary/20 to-accent-primary/10"
          />
        )}
        {bracketData.quarters?.length > 0 && (
          <BracketRoundAesthetic
            title="Cuartos de Final" subtitle="8 equipos"
            matches={bracketData.quarters}
            getFlag={getFlag}
            roundColor="from-accent-primary/20 to-accent-premium/10"
          />
        )}
        {bracketData.semis?.length > 0 && (
          <BracketRoundAesthetic
            title="Semifinales" subtitle="4 equipos"
            matches={bracketData.semis}
            getFlag={getFlag}
            roundColor="from-accent-premium/20 to-accent-primary/10"
          />
        )}
        {bracketData.thirdPlace && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-accent-premium/10 to-state-warning/10 border border-accent-premium/20">
            <div className="text-[10px] text-accent-premium uppercase tracking-wider font-semibold mb-2">🥉 Tercer Puesto</div>
            <PredictedBracketMatchCard match={bracketData.thirdPlace} getFlag={getFlag} />
          </div>
        )}
        {bracketData.final && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-accent-premium/10 via-accent-premium/15 to-accent-premium/10 border border-accent-premium/30">
            <div className="text-center mb-3">
              <span className="text-xl">🏆</span>
              <div className="text-[10px] text-accent-premium uppercase tracking-[0.2em] font-bold">La Gran Final</div>
            </div>
            <PredictedBracketMatchCard match={bracketData.final} getFlag={getFlag} isFinal />
          </div>
        )}
      </div>
    </div>
  );
}

function BracketRoundAesthetic({ title, subtitle, matches, getFlag, roundColor }: {
  title: string; subtitle: string; matches: any[]; getFlag: (n: string) => string; roundColor: string;
}) {
  return (
    <div className={`p-4 rounded-xl bg-gradient-to-r ${roundColor} border border-white/5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-bold text-fg-primary">{title}</h4>
          <span className="text-[10px] text-fg-tertiary">{subtitle}</span>
        </div>
        <span className="text-[10px] text-fg-tertiary font-mono">{matches.length} partidos</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {matches.map((m: any) => m && <PredictedBracketMatchCard key={m.id || Math.random()} match={m} getFlag={getFlag} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PREDICTED BRACKET MATCH CARD (Phase 2) — shows predicted + actual side-by-side
// ═══════════════════════════════════════════════════════════════
function PredictedBracketMatchCard({ match: m, getFlag, isFinal = false }: { match: any; getFlag: (n: string) => string; isFinal?: boolean }) {
  if (!m) return null;

  // Determine which fields to use: predicted-bracket format vs legacy sim format
  const usesPredictedFormat = m.predictedHomeScore !== undefined;

  const homeTeam = m.homeTeam;
  const awayTeam = m.awayTeam;
  const predHome = usesPredictedFormat ? m.predictedHomeScore : m.homeScore;
  const predAway = usesPredictedFormat ? m.predictedAwayScore : m.awayScore;
  const actualHome = usesPredictedFormat ? m.actualHomeScore : (m.isPlayed ? m.homeScore : null);
  const actualAway = usesPredictedFormat ? m.actualAwayScore : (m.isPlayed ? m.awayScore : null);
  const isPlayed = usesPredictedFormat ? m.isPlayed : (m.isPlayed || m.homeScore != null);
  const status = usesPredictedFormat ? m.status : 'predicted';
  const predictedWinner = usesPredictedFormat ? m.predictedWinner : null;

  const homeWin = isPlayed && (actualHome! > actualAway!);
  const awayWin = isPlayed && (actualAway! > actualHome!);

  // Card styling based on status
  const getCardStyle = () => {
    if (isFinal) return 'bg-[var(--match-gold-bg)]/80 border-[var(--match-gold-border)]/40';
    if (!isPlayed) return 'bg-[var(--match-card-scheduled)]/60 border-border-subtle/60';
    switch (status) {
      case 'exact': return 'bg-[var(--match-correct-bg)]/50 border-[var(--match-correct-border)]/40';
      case 'correct': return 'bg-[var(--match-partial-bg)]/50 border-[var(--match-partial-border)]/40';
      case 'wrong': return 'bg-[var(--match-wrong-bg)]/50 border-[var(--match-wrong-border)]/40';
      default: return 'bg-surface/80 border-border-subtle';
    }
  };

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${getCardStyle()}`}>
      {/* Home team */}
      <div className="flex items-center gap-1.5 min-w-0 w-[36%]">
        <span className="text-base shrink-0">{getFlag(homeTeam)}</span>
        <span className={`truncate ${homeWin ? 'font-bold text-[var(--match-correct-text)]' : isPlayed && !homeWin ? 'text-fg-tertiary' : 'text-fg-secondary'}`}>
          {homeTeam}
        </span>
      </div>

      {/* Score block — vertical: predicted + actual */}
      <div className="shrink-0 px-1 text-center flex flex-col items-center gap-0.5">
        {/* Actual score (if played) */}
        {isPlayed && actualHome != null && actualAway != null ? (
          <span className={cn(
            "font-mono font-bold text-sm px-2 py-0.5 rounded-[var(--r-sm)]",
            isFinal ? 'text-lg text-accent-premium' : 'text-sm',
            homeWin ? 'bg-[var(--match-correct-score)]/30 text-[var(--match-correct-text)]' : awayWin ? 'bg-[var(--match-correct-score)]/30 text-[var(--match-correct-text)]' : 'bg-raised text-fg-primary',
          )}>
            {actualHome} - {actualAway}
          </span>
        ) : (
          <span className="text-fg-disabled font-mono text-sm">vs</span>
        )}

        {/* Predicted score (always shown) */}
        {predHome != null && predAway != null && (
          <span className={`text-[9px] font-mono tabular-nums ${isPlayed ? 'text-fg-tertiary' : 'text-fg-secondary'}`}>
            {isPlayed ? `Pred: ${predHome}-${predAway}` : `${predHome}-${predAway}`}
          </span>
        )}

        {/* Probability for unplayed matches */}
        {!isPlayed && m.homeWinProb != null && (
          <span className="text-[9px] text-fg-tertiary">{m.homeWinProb}%</span>
        )}
      </div>

      {/* Status icon for played matches */}
      {isPlayed && (
        <div className="shrink-0">
          {status === 'exact' && <span className="text-state-success text-sm">✓</span>}
          {status === 'correct' && <span className="text-state-success/70 text-sm">~</span>}
          {status === 'wrong' && <span className="text-state-danger text-sm">✗</span>}
        </div>
      )}

      {/* Away team */}
      <div className="flex items-center gap-1.5 min-w-0 w-[36%] justify-end">
        <span className={`truncate text-right ${awayWin ? 'font-bold text-[var(--match-correct-text)]' : isPlayed && !awayWin ? 'text-fg-tertiary' : 'text-fg-secondary'}`}>
          {awayTeam}
        </span>
        <span className="text-base shrink-0">{getFlag(awayTeam)}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════
function MatchDetailModal({ match, realResult, status, getFlag, getRoundLabel, onClose }: {
  match: FixtureMatch; realResult?: RealResult; status: MatchStatus;
  getFlag: (n: string) => string; getRoundLabel: (r: string) => string; onClose: () => void;
}) {
  const pal = PALETTES[status];
  const isPlayed = status !== 'upcoming';
  const homeElo = ELO_RATINGS[match.homeTeam]?.elo || 1500;
  const awayElo = ELO_RATINGS[match.awayTeam]?.elo || 1500;
  const homePower = POWER_RATINGS[match.homeTeam] || { attack: 50, defense: 50, midfield: 50 };
  const awayPower = POWER_RATINGS[match.awayTeam] || { attack: 50, defense: 50, midfield: 50 };
  // Use fixture actualScore as source of truth, fallback to live-scores result
  const actualScore = match.isFinished && match.actualHome != null && match.actualAway != null
    ? { homeScore: match.actualHome, awayScore: match.actualAway }
    : realResult;
  const realWinner = actualScore ? (actualScore.homeScore > actualScore.awayScore ? 'home' : actualScore.homeScore < actualScore.awayScore ? 'away' : 'draw') : null;
  const seal = (isPlayed && match.homeGoals !== null && actualScore) ? computeSealStatus(match.homeGoals, match.awayGoals!, actualScore.homeScore, actualScore.awayScore) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full sm:max-w-md bg-[var(--match-modal-bg)] border border-border-subtle rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`${match.homeTeam} vs ${match.awayTeam}`}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-[var(--r-md)] bg-raised text-fg-tertiary hover:text-fg-primary transition-colors" aria-label="Cerrar"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>

        <div className="p-5">
          <div className="text-[10px] text-accent-primary font-semibold uppercase tracking-wider mb-4">
            {match.round === 'group' ? `Grupo ${match.group}` : getRoundLabel(match.round)}
          </div>

          {/* Teams + Score */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">{getFlag(match.homeTeam)}</div>
              <div className={cn("text-xs font-bold", isPlayed && realWinner === 'home' ? pal.teamWinner : "text-fg-primary")}>{match.homeTeam}</div>
              <div className="text-[10px] text-fg-tertiary">Elo {homeElo}</div>
            </div>

            <div className="text-center">
              {isPlayed && actualScore ? (
                <div className="flex flex-col items-center gap-1">
                  {/* Real score — TOP, big */}
                  <div className={cn("px-4 py-2 rounded-[var(--r-md)]", pal.scoreBg)}>
                    <div className={cn("text-2xl font-bold font-mono tabular-nums", pal.scoreText)}>{actualScore.homeScore} - {actualScore.awayScore}</div>
                  </div>
                  {/* Predicted — BOTTOM, small */}
                  {match.homeGoals !== null && match.awayGoals !== null && (
                    <div className="text-[11px] text-fg-tertiary font-mono mt-1">Pred: <span className={pal.predText}>{match.homeGoals}-{match.awayGoals}</span></div>
                  )}
                  {/* Status badge */}
                  <span className="mt-1">{pal.icon}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {/* TBD — big */}
                  <div className="px-4 py-2 rounded-[var(--r-md)] bg-raised">
                    <div className="text-2xl font-bold font-mono tabular-nums text-fg-disabled">TBD</div>
                  </div>
                  {/* Predicted — small */}
                  {match.homeGoals !== null && match.awayGoals !== null && (
                    <div className="text-[11px] text-fg-secondary font-mono mt-1">Pred: <span className="text-accent-primary">{match.homeGoals}-{match.awayGoals}</span></div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">{getFlag(match.awayTeam)}</div>
              <div className={cn("text-xs font-bold", isPlayed && realWinner === 'away' ? pal.teamWinner : "text-fg-primary")}>{match.awayTeam}</div>
              <div className="text-[10px] text-fg-tertiary">Elo {awayElo}</div>
            </div>
          </div>

          {seal && <div className="flex justify-center mb-4"><MatchSeal dual winnerStatus={seal.winnerStatus} scoreStatus={seal.scoreStatus} /></div>}

          {/* Probabilities */}
          {match.homeWin !== null && (
            <div className="pt-3 border-t border-border-subtle">
              <div className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold mb-2">Probabilidades</div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-1">
                <div style={{ width: `${match.homeWin}%` }} className="bg-accent-primary/70" />
                <div style={{ width: `${match.draw}%` }} className="bg-fg-tertiary/30" />
                <div style={{ width: `${match.awayWin}%` }} className="bg-state-danger/70" />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-accent-primary font-semibold">{match.homeWin}%</span>
                <span className="text-fg-tertiary">{match.draw}%</span>
                <span className="text-state-danger font-semibold">{match.awayWin}%</span>
              </div>
            </div>
          )}

          {/* ═══ DRIFT SPARKLINE — Evolución temporal ═══ */}
          <DriftSparkline matchId={match.id} homeTeam={match.homeTeam} awayTeam={match.awayTeam} className="mt-3" />

          {/* ═══ DRIFT — Prediction vs Reality ═══ */}
          {isPlayed && realResult && match.homeGoals !== null && match.awayGoals !== null && (() => {
            const maeHome = Math.abs(match.homeGoals - realResult.homeScore);
            const maeAway = Math.abs(match.awayGoals - realResult.awayScore);
            const totalMae = (maeHome + maeAway) / 2;
            const driftColor = totalMae < 0.5 ? 'bg-[var(--match-correct-score)] text-[var(--match-correct-text)]' : totalMae <= 1 ? 'bg-[var(--match-gold-border)] text-state-warning' : 'bg-[var(--match-wrong-score)] text-[var(--match-wrong-text)]';
            const driftLabel = totalMae < 0.5 ? 'Muy cercana' : totalMae <= 1 ? 'Cercana' : 'Lejana';
            return (
              <div className="pt-3 mt-3 border-t border-border-subtle">
                <div className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold mb-2">Drift de Predicción</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-fg-tertiary mb-1">Predicción</div>
                    <div className="px-3 py-1.5 bg-raised rounded-[var(--r-md)]">
                      <span className="font-mono font-bold text-sm text-fg-secondary">{match.homeGoals}-{match.awayGoals}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">→</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", driftColor)}>{driftLabel}</span>
                    <span className="text-[9px] text-fg-tertiary font-mono">MAE {totalMae.toFixed(1)}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-fg-tertiary mb-1">Real</div>
                    <div className="px-3 py-1.5 bg-raised rounded-[var(--r-md)]">
                      <span className={cn("font-mono font-bold text-sm", pal.scoreText)}>{realResult.homeScore}-{realResult.awayScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stats */}
          <div className="pt-3 mt-3 border-t border-border-subtle">
            <div className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold mb-2">Comparación</div>
            {['attack', 'midfield', 'defense'].map(stat => {
              const h = homePower[stat as keyof typeof homePower]; const a = awayPower[stat as keyof typeof awayPower];
              const l: Record<string, string> = { attack: 'Ataque', midfield: 'Medio', defense: 'Defensa' };
              return (
                <div key={stat} className="mb-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5"><span className="text-accent-primary">{h}</span><span className="text-fg-tertiary">{l[stat]}</span><span className="text-state-danger">{a}</span></div>
                  <div className="flex h-1.5 rounded-full overflow-hidden"><div className="bg-accent-primary/60" style={{ width: `${(h/(h+a))*100}%` }} /><div className="bg-state-danger/60" style={{ width: `${(a/(h+a))*100}%` }} /></div>
                </div>
              );
            })}
          </div>

          {/* Likely scores */}
          {match.topScores?.length && (
            <div className="pt-3 mt-3 border-t border-border-subtle">
              <div className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold mb-2">Marcadores Probables</div>
              <div className="space-y-1">
                {match.topScores.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-fg-tertiary w-3">{i+1}</span>
                    <span className="font-mono font-bold text-fg-primary w-7">{s.home}-{s.away}</span>
                    <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden"><div className="h-full bg-accent-premium/40 rounded-full" style={{ width: `${Math.min(100, s.probability*3)}%` }} /></div>
                    <span className="text-fg-tertiary w-8 text-right">{s.probability}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
