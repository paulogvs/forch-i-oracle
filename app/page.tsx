'use client';

import { useMemo, useState, useEffect } from 'react';
import { Target, Zap, CheckCircle2, ArrowRight, TrendingUp, Activity, Trophy, BarChart3, Calendar, Clock, ChevronRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';
import { useFixture } from '@/lib/swr/hooks';
import { useLiveScores } from '@/lib/swr/hooks';
import { useSimulation } from '@/lib/swr/hooks';
import { groupResultsByDate, getUpcomingMatches, getFlag, getRoundLabel } from '@/lib/dashboard-utils';
import type { MatchResultDetail } from '@/lib/dashboard-utils';
import { motion, AnimatePresence } from 'motion/react';
import { simulateTournamentMulti, type ChampionProbability } from '@/lib/tournament-sim';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface FixtureMatch {
  id: string; homeTeam: string; awayTeam: string; round: string; group: string;
  predictedScore: [number, number] | null; homeWinPct: number; drawPct: number; awayWinPct: number;
  confidence: string | null;
}
interface LiveMatch {
  homeTeam: string; awayTeam: string; homeScore: number; awayScore: number;
  isFinished: boolean; isLive: boolean; timeElapsed: string; group: string;
  homeScorers: string[]; awayScorers: string[];
}
interface SimResult {
  matchId: string; homeScore: number; awayScore: number; winner: string;
}

interface FixtureResponse { success: boolean; fixture: FixtureMatch[]; }
interface LiveResponse { success: boolean; finished: LiveMatch[]; live: LiveMatch[]; }
interface SimResponse {
  success: boolean; results: SimResult[]; top8: any[];
  championProbs?: { teamId: string; championProb: number; simulationsCount: number; totalSimulations: number }[];
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { data: fixtureData, isLoading: fixtureLoading } = useFixture<FixtureResponse>();
  const { data: liveData, isLoading: liveLoading } = useLiveScores<LiveResponse>();
  const { data: simData, isLoading: simLoading } = useSimulation<SimResponse>();

  const loading = fixtureLoading || liveLoading || simLoading;

  // ─── Predictions Map ──────────────────────────────────────
  const predictions = useMemo(() => {
    const predMap = new Map<string, FixtureMatch>();
    if (fixtureData?.success && fixtureData.fixture) {
      for (const m of fixtureData.fixture) {
        predMap.set(m.id, {
          id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.round, group: m.group || '',
          predictedScore: m.predictedScore ?? null,
          homeWinPct: m.homeWinPct ?? 0, drawPct: m.drawPct ?? 0, awayWinPct: m.awayWinPct ?? 0,
          confidence: m.confidence ?? null,
        });
      }
    }
    return predMap;
  }, [fixtureData]);

  // ─── Finished & Live ──────────────────────────────────────
  const finishedMatches = useMemo(() => {
    if (!liveData?.success) return [];
    return liveData.finished || [];
  }, [liveData]);

  const liveNow = useMemo(() => {
    if (!liveData?.success) return [];
    return liveData.live || [];
  }, [liveData]);

  const simResults = useMemo(() => {
    const resultMap = new Map<string, SimResult>();
    if (simData?.success && simData.results) {
      for (const r of simData.results) resultMap.set(r.matchId, r);
    }
    return resultMap;
  }, [simData]);

  // ─── Champion Probabilities from simulation ───────────────
  const [fallbackChampionProbs, setFallbackChampionProbs] = useState<ChampionProbability[] | null>(null);
  const [championTimedOut, setChampionTimedOut] = useState(false);

  const championProbs = useMemo(() => {
    // Try server championProbs first (from cron simulation)
    if (simData?.success && simData.championProbs && simData.championProbs.length > 0) {
      return simData.championProbs.slice(0, 8);
    }
    // Use fallback client-side simulation results if available
    if (fallbackChampionProbs && fallbackChampionProbs.length > 0) {
      return fallbackChampionProbs.map(c => ({
        teamId: c.team,
        championProb: c.pct,
        simulationsCount: c.wins,
        totalSimulations: c.wins / (c.pct / 100) || 100,
      }));
    }
    return null;
  }, [simData, fallbackChampionProbs]);

  // Client-side fallback: run simulation if no server data or after timeout
  useEffect(() => {
    const needsFallback = !championProbs && !fallbackChampionProbs;
    if (!needsFallback) return;

    // 8-second timeout: if no champion data arrives, force client-side simulation
    const timeout = setTimeout(() => {
      setChampionTimedOut(true);
      simulateTournamentMulti(50, [])
        .then(result => setFallbackChampionProbs(result.top8))
        .catch(() => {});
    }, 8000);

    // Also try fetching from server and running local simulation
    fetch('/api/simulate-tournament')
      .then(r => r.json())
      .then(async (data) => {
        clearTimeout(timeout);
        if (data.championProbs && data.championProbs.length > 0) {
          // Server has data — use it directly
          return;
        }
        const realResults = data.results || [];
        const result = await simulateTournamentMulti(50, realResults);
        setFallbackChampionProbs(result.top8);
      })
      .catch(() => {
        // On fetch failure, rely on timeout fallback
      });

    return () => clearTimeout(timeout);
  }, [championProbs, fallbackChampionProbs]);

  // ─── Compute Stats ────────────────────────────────────────
  const stats = (() => {
    let correct = 0, wrong = 0, totalPlayed = 0;
    let over25Correct = 0, over25Total = 0, exactScores = 0;
    const matchDetails: MatchResultDetail[] = [];

    for (const lm of finishedMatches) {
      const staticMatch = ALL_MATCHES.find(m => m.homeTeam === lm.homeTeam && m.awayTeam === lm.awayTeam);
      if (!staticMatch) continue;
      const pred = predictions.get(staticMatch.id);
      if (!pred?.predictedScore) continue;

      const [pH, pA] = pred.predictedScore;
      const rH = lm.homeScore;
      const rA = lm.awayScore;
      const predWinner = pH > pA ? 'home' : pH < pA ? 'away' : 'draw';
      const realWinner = rH > rA ? 'home' : rH < rA ? 'away' : 'draw';
      const isCorrect = predWinner === realWinner;
      const isExact = pH === rH && pA === rA;

      if (isCorrect) correct++; else wrong++;
      totalPlayed++;
      const predOver25 = (pH + pA) > 2;
      const realOver25 = (rH + rA) > 2;
      if (predOver25 === realOver25) over25Correct++;
      over25Total++;
      if (isExact) exactScores++;

      matchDetails.push({
        home: lm.homeTeam, away: lm.awayTeam,
        pred: [pH, pA], real: [rH, rA],
        correct: isCorrect, exact: isExact,
        date: staticMatch.date, time: staticMatch.time,
        round: staticMatch.round, group: staticMatch.group,
        confidence: pred.confidence,
      });
    }

    return {
      winnerAccuracy: totalPlayed > 0 ? Math.round((correct / totalPlayed) * 100) : 0,
      errorCount: wrong, correctCount: correct, totalPlayed,
      over25Accuracy: over25Total > 0 ? Math.round((over25Correct / over25Total) * 100) : 0,
      exactScores, totalMatches: ALL_MATCHES.length,
      predictedCount: Array.from(predictions.values()).filter(p => p.predictedScore !== null).length,
      matchDetails,
    };
  })();

  // ─── Group results by date ────────────────────────────────
  const dateGroups = useMemo(() => groupResultsByDate(stats.matchDetails), [stats.matchDetails]);

  // ─── Upcoming matches ─────────────────────────────────────
  const upcomingMatches = useMemo(() => {
    const finishedSet = new Set(
      finishedMatches.map(f => `${f.homeTeam}_vs_${f.awayTeam}`)
    );
    return getUpcomingMatches(predictions, finishedSet, 4);
  }, [predictions, finishedMatches]);

  // ─── Match of the Day ─────────────────────────────────────
  const matchOfDay = useMemo(() => {
    const upcoming = Array.from(predictions.values()).filter(p =>
      p.predictedScore && !finishedMatches.some(f => f.homeTeam === p.homeTeam && f.awayTeam === p.awayTeam)
    );
    if (upcoming.length === 0) return null;

    const scored = upcoming.map(p => {
      const balance = Math.abs(p.homeWinPct - p.awayWinPct);
      const scoreCloseness = Math.abs(p.predictedScore![0] - p.predictedScore![1]) <= 1 ? 0 : 2;
      return { ...p, interestScore: balance + scoreCloseness };
    });
    scored.sort((a, b) => a.interestScore - b.interestScore);
    return scored[0];
  }, [predictions, finishedMatches]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade pb-8">

      {/* ═══ HEADER ═══ */}
      <header className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="premium">Panel de Control</Badge>
            <span className="text-[10px] text-fg-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald animate-pulse" />
              Auto-sync
            </span>
          </div>
          <span className="text-[10px] text-fg-tertiary tabular-nums">
            WC2026 · {stats.predictedCount}/{stats.totalMatches}
          </span>
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Predicciones IA <span className="text-gold">Mundial 2026</span>
          </h1>
          <p className="text-xs text-fg-secondary mt-0.5">Poisson + Dixon-Coles + Elo + xG · Motor Ensemble v3</p>
        </div>
        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-raised/50 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-primary via-accent-emerald to-accent-premium rounded-full transition-all duration-700"
              style={{ width: `${stats.totalMatches > 0 ? (stats.predictedCount / stats.totalMatches) * 100 : 0}%` }} />
          </div>
          <span className="text-[10px] text-fg-tertiary tabular-nums">
            {Math.round((stats.predictedCount / stats.totalMatches) * 100)}%
          </span>
        </div>
      </header>

      {/* ═══ MÉTRICAS — 2x2 grid ═══ */}
      <div className="grid grid-cols-2 gap-2">
        <StatPill
          icon={<Target className="h-3.5 w-3.5" />}
          label="Acierto"
          value={stats.totalPlayed > 0 ? `${stats.winnerAccuracy}%` : '—'}
          sub={stats.totalPlayed > 0 ? `${stats.correctCount}/${stats.totalPlayed} ganadores` : 'Sin datos'}
          color={stats.totalPlayed > 0 ? (stats.winnerAccuracy >= 50 ? 'emerald' : 'red') : 'blue'}
        />
        <StatPill
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Error Goles"
          value={stats.totalPlayed > 0 ? (Math.abs(stats.matchDetails.reduce((a, m) => a + Math.abs(m.pred[0] - m.real[0]) + Math.abs(m.pred[1] - m.real[1]), 0) / Math.max(1, stats.totalPlayed))).toFixed(1) : '—'}
          sub="MAE promedio"
          color="blue"
        />
        <StatPill
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Over 2.5"
          value={stats.over25Accuracy > 0 ? `${stats.over25Accuracy}%` : '—'}
          sub={stats.totalPlayed > 0 ? `Predicción over/under` : 'Sin datos'}
          color="emerald"
        />
        <StatPill
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Jugados"
          value={`${stats.totalPlayed}`}
          sub={`${stats.exactScores} 🎯 exactos`}
          color="gold"
        />
      </div>

      {/* ═══ PARTIDO DEL DÍA ═══ */}
      {matchOfDay && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-accent-premium" />
            Partido del Día
          </h2>
          <MatchOfDayCard match={matchOfDay} getFlag={getFlag} />
        </motion.section>
      )}

      {/* ═══ EN VIVO ═══ */}
      <AnimatePresence>
        {liveNow.length > 0 && (
          <motion.section
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2">
              <span className="live-dot w-2.5 h-2.5 rounded-full bg-accent-emerald" />
              <h2 className="text-xs font-bold text-fg-primary">En Vivo</h2>
              <Badge variant="live">{liveNow.length} {liveNow.length === 1 ? 'partido' : 'partidos'}</Badge>
            </div>
            <div className="space-y-2">
              {liveNow.map((m, i) => (
                <LiveMatchCard key={i} match={m} getFlag={getFlag} />
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ═══ PRÓXIMOS PARTIDOS ═══ */}
      {upcomingMatches.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-2"
        >
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-accent-primary" />
            Próximos Partidos
          </h2>
          <div className="space-y-2">
            {upcomingMatches.map((m) => (
              <UpcomingMatchCard key={m.id} match={m} getFlag={getFlag} />
            ))}
          </div>
        </motion.section>
      )}

      {/* ═══ RESULTADOS REALES — grouped by date ═══ */}
      {dateGroups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-accent-emerald" />
            Resultados Reales
            <span className="text-fg-tertiary font-normal">· {stats.totalPlayed} jugados</span>
          </h2>

          {dateGroups.map((group) => (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Date separator with accuracy badge */}
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-[11px] font-bold text-fg-tertiary uppercase tracking-wider">{group.label}</h3>
                <div className="flex-1 h-px bg-border-subtle" />
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    group.accuracyPct >= 60 ? "bg-[#052E16] text-[#4ADE80]"
                    : group.accuracyPct >= 40 ? "bg-[#854D0E]/30 text-[#FACC15]"
                    : "bg-[#2A0A0A] text-[#FCA5A5]"
                  )}>
                    {group.correctCount}/{group.totalCount}
                  </span>
                </div>
              </div>

              {/* Matches in this date group */}
              <div className="space-y-1.5">
                {group.matches.map((m, i) => (
                  <ResultCard key={`${m.home}-${m.away}-${i}`} match={m} getFlag={getFlag} />
                ))}
              </div>
            </motion.div>
          ))}
        </section>
      )}

      {/* ═══ CAMPEÓN DEL MUNDO — Top 8 ═══ */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-xs font-bold text-fg-primary flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-accent-premium" />
          Campeón del Mundo
        </h2>
        {championProbs && championProbs.length > 0 ? (
          <ChampionWidget probs={championProbs} />
        ) : (
          <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-premium/20 text-center">
            <div className="flex items-center justify-center gap-2 text-xs">
              <div className="h-3 w-3 rounded-full bg-accent-premium/40 animate-pulse" />
              <span className="text-fg-secondary">{championTimedOut ? 'Generando predicciones locales...' : 'Cargando campeones...'}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-raised animate-pulse" />
                  <div className="flex-1 h-3 rounded bg-raised/60 animate-pulse" style={{ width: `${80 - i * 15}%`, marginLeft: 'auto', marginRight: 'auto' }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* ═══ NAV ═══ */}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-fg-primary">Explorar</h2>
        <div className="space-y-2">
          <QuickLink href="/fixture" icon="⚡" title="Predicción Completa" desc={`${stats.predictedCount} partidos · Tablas · Bracket`} accent="accent-premium" />
          <QuickLink href="/live" icon="📡" title="En Vivo" desc="Resultados en tiempo real" accent="accent-emerald" highlight={liveNow.length > 0} />
          <QuickLink href="/benchmark" icon="🤖" title="Benchmark IA" desc="10 modelos compitiendo" accent="accent-secondary" />
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MatchOfDayCard({ match, getFlag }: { match: any; getFlag: (n: string) => string }) {
  const [h, a] = match.predictedScore!;
  return (
    <div className="surface-interactive p-4 rounded-[var(--r-lg)] border border-accent-premium/20 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-premium/5 via-transparent to-accent-premium/5 pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <div className="flex-1 text-center">
          <span className="text-2xl block">{getFlag(match.homeTeam)}</span>
          <div className="text-xs font-bold text-fg-primary mt-1">{match.homeTeam}</div>
          <div className="text-[10px] text-fg-tertiary">{Math.round(match.homeWinPct)}%</div>
        </div>
        <div className="text-center px-4">
          <div className="px-4 py-2 bg-accent-premium/15 rounded-[var(--r-md)] border border-accent-premium/20">
            <span className="font-mono font-bold text-lg text-accent-premium tabular-nums">{h}-{a}</span>
          </div>
          <div className="text-[10px] text-fg-tertiary mt-1">Predicción</div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-2xl block">{getFlag(match.awayTeam)}</span>
          <div className="text-xs font-bold text-fg-primary mt-1">{match.awayTeam}</div>
          <div className="text-[10px] text-fg-tertiary">{Math.round(match.awayWinPct)}%</div>
        </div>
      </div>

      <p className="relative text-[10px] text-fg-tertiary text-center mt-3 flex items-center justify-center gap-1">
        <Sparkles className="h-3 w-3 text-accent-premium" />
        Partido equilibrado — predicción ajustada por motor ensemble
      </p>
    </div>
  );
}

function LiveMatchCard({ match, getFlag }: { match: LiveMatch; getFlag: (n: string) => string }) {
  return (
    <div className="surface-live p-3 rounded-[var(--r-lg)] border border-accent-emerald/20 relative overflow-hidden">
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <span className="live-dot w-2 h-2 rounded-full bg-accent-emerald" />
        <span className="text-[10px] text-accent-emerald font-bold">VIVO</span>
        {match.timeElapsed && (
          <span className="text-[10px] text-fg-tertiary ml-1">{match.timeElapsed}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-lg">{getFlag(match.homeTeam)}</span>
          <span className="font-medium text-fg-primary">{match.homeTeam}</span>
        </div>
        <div className="px-3 py-1.5 bg-canvas/50 rounded-[var(--r-md)] border border-accent-emerald/30">
          <span className="font-mono font-bold text-lg text-accent-emerald tabular-nums">
            {match.homeScore} - {match.awayScore}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-medium text-fg-primary">{match.awayTeam}</span>
          <span className="text-lg">{getFlag(match.awayTeam)}</span>
        </div>
      </div>

      {/* Scorers */}
      {(match.homeScorers?.length > 0 || match.awayScorers?.length > 0) && (
        <div className="mt-2 pt-2 border-t border-accent-emerald/10 flex justify-between text-[10px] text-fg-tertiary">
          <span>{match.homeScorers?.join(', ')}</span>
          <span>{match.awayScorers?.join(', ')}</span>
        </div>
      )}
    </div>
  );
}

function UpcomingMatchCard({ match, getFlag }: { match: any; getFlag: (n: string) => string }) {
  const [h, a] = match.predictedScore || [0, 0];
  return (
    <div className="surface p-3 rounded-[var(--r-lg)] border border-border-subtle flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{getFlag(match.homeTeam)}</span>
          <span className="text-xs font-bold text-fg-primary truncate">{match.homeTeam}</span>
        </div>
      </div>
      <div className="shrink-0 text-center">
        <div className="px-2.5 py-1 bg-raised/50 rounded-[var(--r-sm)]">
          <span className="font-mono font-bold text-sm text-fg-secondary tabular-nums">{h}-{a}</span>
        </div>
        <div className="text-[9px] text-fg-tertiary mt-0.5">{getRoundLabel(match.round)}</div>
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-xs font-bold text-fg-primary truncate">{match.awayTeam}</span>
          <span className="text-base">{getFlag(match.awayTeam)}</span>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ match, getFlag }: { match: MatchResultDetail; getFlag: (n: string) => string }) {
  const palette = match.exact
    ? { card: 'bg-[#052E16] border-[#166534]', scoreBg: 'bg-[#166534]', scoreText: 'text-[#4ADE80]', teamText: 'text-[#BBF7D0]' }
    : match.correct
    ? { card: 'bg-[#14291E] border-[#1B6B3A]', scoreBg: 'bg-[#1B6B3A]', scoreText: 'text-[#FACC15]', teamText: 'text-[#BBF7D0]' }
    : { card: 'bg-[#2A0A0A] border-[#991B1B]', scoreBg: 'bg-[#991B1B]', scoreText: 'text-[#FCA5A5]', teamText: 'text-[#FECACA]' };

  return (
    <div className={cn("flex items-center gap-2 p-3 rounded-[var(--r-lg)] border transition-all", palette.card)}>
      {/* Home */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-base shrink-0">{getFlag(match.home)}</span>
        <span className={cn("text-xs truncate", palette.teamText)}>{match.home}</span>
      </div>

      {/* Score: Real TOP, Pred BOTTOM */}
      <div className="shrink-0 flex flex-col items-center gap-0.5">
        <div className={cn("px-2.5 py-0.5 rounded-[var(--r-sm)]", palette.scoreBg)}>
          <span className={cn("font-mono font-bold text-sm tabular-nums", palette.scoreText)}>
            {match.real[0]}-{match.real[1]}
          </span>
        </div>
        <span className="text-[9px] text-[#6B7280] font-mono">Pred: {match.pred[0]}-{match.pred[1]}</span>
      </div>

      {/* Status icon */}
      <span className="text-xs shrink-0">{match.exact ? '🎯' : match.correct ? '✅' : '❌'}</span>

      {/* Away */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
        <span className={cn("text-xs truncate text-right", palette.teamText)}>{match.away}</span>
        <span className="text-base shrink-0">{getFlag(match.away)}</span>
      </div>
    </div>
  );
}

function ChampionWidget({ probs }: { probs: { teamId: string; championProb: number; simulationsCount: number; totalSimulations: number }[] }) {
  const top = probs[0];
  const maxProb = Math.max(...probs.map(p => p.championProb), 1);

  return (
    <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-premium/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-premium/5 via-transparent to-accent-premium/5 pointer-events-none" />

      {/* Leader highlight */}
      <div className="relative text-center mb-3">
        <div className="text-2xl mb-1">🏆</div>
        <div className="text-base font-black text-accent-premium">{top.teamId}</div>
        <div className="text-[10px] text-fg-tertiary">
          {top.championProb}% · {top.simulationsCount}/{top.totalSimulations} simulaciones
        </div>
      </div>

      {/* Top 8 bars */}
      <div className="relative space-y-1.5">
        {probs.map((p, i) => (
          <div key={p.teamId} className="flex items-center gap-2">
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
              i === 0 ? "bg-accent-premium text-canvas" : i === 1 ? "bg-fg-secondary text-canvas" : i === 2 ? "bg-state-warning/80 text-white" : "bg-white/[0.06] text-fg-disabled"
            )}>
              {i + 1}
            </span>
            <span className="text-[11px] font-semibold text-fg-primary w-20 truncate shrink-0">{p.teamId}</span>
            <div className="flex-1 h-3 bg-raised/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${(p.championProb / maxProb) * 100}%`,
                  background: i === 0 ? 'var(--gradient-gold)' : i === 1 ? 'linear-gradient(to right, #94A3B8cc, #94A3B8)' : i === 2 ? 'linear-gradient(to right, #F59E0Bcc, #F59E0B)' : 'linear-gradient(to right, var(--text-disabled), var(--text-tertiary))',
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-accent-premium w-12 text-right shrink-0 font-mono tabular-nums">
              {p.championProb}%
            </span>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-fg-disabled text-center mt-3">
        Basado en 100 simulaciones · Motor Poisson + Elo + xG · Se auto-ajusta con cada resultado real
      </p>
    </div>
  );
}

function StatPill({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: React.ReactNode; sub: string; color: 'blue' | 'emerald' | 'gold' | 'red';
}) {
  const c = {
    blue: { bg: 'bg-tint-blue', border: 'border-accent-primary/20', icon: 'text-accent-primary', val: 'text-accent-primary' },
    emerald: { bg: 'bg-tint-green', border: 'border-accent-emerald/20', icon: 'text-accent-emerald', val: 'text-accent-emerald' },
    gold: { bg: 'bg-tint-gold', border: 'border-accent-premium/20', icon: 'text-accent-premium', val: 'text-accent-premium' },
    red: { bg: 'bg-tint-red', border: 'border-state-danger/20', icon: 'text-state-danger', val: 'text-state-danger' },
  }[color];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("p-3 rounded-[var(--r-lg)] border", c.bg, c.border)}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-fg-tertiary uppercase tracking-wider font-semibold">{label}</span>
        <span className={c.icon}>{icon}</span>
      </div>
      <div className={cn("text-xl font-bold font-mono tabular-nums", c.val)}>{value}</div>
      <div className="text-[10px] text-fg-tertiary mt-0.5">{sub}</div>
    </motion.div>
  );
}

function QuickLink({ href, icon, title, desc, accent, highlight }: {
  href: string; icon: string; title: string; desc: string; accent: string; highlight?: boolean;
}) {
  return (
    <Link href={href} className="block group">
      <div className="surface-interactive px-4 py-3 flex items-center gap-3 rounded-[var(--r-lg)]">
        <span className={cn("w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center text-base", `bg-${accent}/15`)}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-fg-primary">{title}</span>
            {highlight && <Badge variant="live">en vivo</Badge>}
          </div>
          <span className="text-[10px] text-fg-tertiary">{desc}</span>
        </div>
        <ChevronRight className={cn("h-4 w-4 text-fg-tertiary group-hover:translate-x-0.5 transition-transform", `text-${accent}`)} />
      </div>
    </Link>
  );
}
