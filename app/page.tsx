'use client';

import { useMemo } from 'react';
import { Target, Zap, CheckCircle2, ArrowRight, TrendingUp, Activity, Trophy, BarChart3, Calendar, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName } from '@/lib/teams';
import { useFixture, useLiveScores, useSimulation } from '@/lib/swr/hooks';
import { useTournamentStore } from '@/lib/store/tournament-store';
import { groupResultsByDate, getUpcomingMatches, getFlag, getRoundLabel } from '@/lib/dashboard-utils';
import type { MatchResultDetail } from '@/lib/dashboard-utils';
import { motion, AnimatePresence } from 'motion/react';
import { computeChampionProbsFromElo, type EloChampionProb } from '@/lib/elo-champion';

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
  success: boolean; results: SimResult[]; top8: any[]; bracket: any;
  championProbs?: { teamId: string; championProb: number; simulationsCount: number; totalSimulations: number }[];
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { fixture: cachedFixture, bracket: cachedBracket, top8: cachedTop8, loading: storeLoading } = useTournamentStore();
  const { data: fixtureData, isLoading: fixtureLoading } = useFixture<FixtureResponse>();
  const { data: liveData, isLoading: liveLoading } = useLiveScores<LiveResponse>();
  const { data: simData, isLoading: simLoading } = useSimulation<SimResponse>();

  const loading = fixtureLoading && liveLoading && simLoading && storeLoading;

  // ─── Predictions Map ──────────────────────────────────────
  const predictions = useMemo(() => {
    const predMap = new Map<string, FixtureMatch>();
    const sourceFixture = fixtureData?.fixture || cachedFixture;
    if (sourceFixture) {
      for (const m of sourceFixture) {
        predMap.set(m.id, {
          id: m.id, homeTeam: m.homeTeam, awayTeam: m.awayTeam, round: m.round, group: m.group || '',
          predictedScore: (m.predictedScore || (m as any).predictedScore) ?? null,
          homeWinPct: (m.homeWinPct || (m as any).homeWinPct) ?? 0,
          drawPct: (m.drawPct || (m as any).drawPct) ?? 0,
          awayWinPct: (m.awayWinPct || (m as any).awayWinPct) ?? 0,
          confidence: m.confidence ?? null,
        });
      }
    }
    return predMap;
  }, [fixtureData, cachedFixture]);

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

  // ─── Champion Probabilities — Monte Carlo Consensus (Single Source of Truth) ──
  const championProbs = useMemo(() => {
    // Priority: use multi-simulation consensus data (5,000 sims)
    const sourceProbs = simData?.championProbs || (simData as any)?.championProbs || cachedTop8;
    if (sourceProbs && sourceProbs.length > 0) {
      return sourceProbs.slice(0, 8).map((p: any) => ({
        teamId: p.teamId || p.team,
        championProb: p.championProb || p.pct,
        simulationsCount: p.simulationsCount || p.wins,
        totalSimulations: p.totalSimulations || 5000,
      }));
    }
    // Fallback: top 8 from top8 array (also from simulation)
    if (simData?.top8 && simData.top8.length > 0) {
      return simData.top8.slice(0, 8).map(c => ({
        teamId: c.team,
        championProb: c.pct,
        simulationsCount: c.wins,
        totalSimulations: 5000,
      }));
    }
    // Deep Fallback: deterministic Elo-based ranking (instant, <1ms)
    const eloProbs = computeChampionProbsFromElo();
    return eloProbs.slice(0, 8).map(c => ({
      teamId: c.teamName,
      championProb: c.championProb,
      simulationsCount: Math.round(c.championProb),
      totalSimulations: 100,
    }));
  }, [simData, cachedTop8]);

  // ─── Projected Champion from Bracket (same source as simulation) ──
  const projectedChampion = useMemo(() => {
    const sourceBracket = simData?.bracket || cachedBracket;
    if (sourceBracket?.champion) {
      return {
        name: sourceBracket.champion,
        runnerUp: sourceBracket.runnerUp,
        thirdPlace: sourceBracket.thirdPlaceTeam,
        flag: sourceBracket.championFlag,
      };
    }
    return null;
  }, [simData, cachedBracket]);

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
                    group.accuracyPct >= 60 ? "bg-[var(--match-correct-bg)] text-[var(--match-correct-text)]"
                    : group.accuracyPct >= 40 ? "bg-[var(--match-gold-border)]/30 text-state-warning"
                    : "bg-[var(--match-wrong-bg)] text-[var(--match-wrong-text)]"
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
        <ChampionWidget probs={championProbs} projectedChampion={projectedChampion} getFlag={getFlag} />
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
    ? { card: 'bg-[var(--match-correct-bg)] border-[var(--match-correct-border)]', scoreBg: 'bg-[var(--match-correct-score)]', scoreText: 'text-[var(--match-correct-text)]', teamText: 'text-state-success/70' }
    : match.correct
    ? { card: 'bg-[var(--match-partial-bg)] border-[var(--match-partial-border)]', scoreBg: 'bg-[var(--match-partial-score)]', scoreText: 'text-state-warning', teamText: 'text-state-success/70' }
    : { card: 'bg-[var(--match-wrong-bg)] border-[var(--match-wrong-border)]', scoreBg: 'bg-[var(--match-wrong-score)]', scoreText: 'text-[var(--match-wrong-text)]', teamText: 'text-state-danger/70' };

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
        <span className="text-[9px] text-fg-tertiary font-mono">Pred: {match.pred[0]}-{match.pred[1]}</span>
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

function ChampionWidget({ probs, projectedChampion, getFlag }: {
  probs: { teamId: string; championProb: number; simulationsCount: number; totalSimulations: number }[];
  projectedChampion?: { name: string; runnerUp?: string; thirdPlace?: string; flag?: string } | null;
  getFlag: (n: string) => string;
}) {
  const top = probs[0];
  const maxProb = Math.max(...probs.map(p => p.championProb), 1);
  const isMonteCarlo = top?.totalSimulations >= 10;

  return (
    <div className="surface p-4 rounded-[var(--r-lg)] border border-accent-premium/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent-premium/5 via-transparent to-accent-premium/5 pointer-events-none" />

      {/* Leader highlight */}
      <div className="relative text-center mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="text-3xl mb-1"
        >🏆</motion.div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-xl">{getFlag(top.teamId)}</span>
          <div className="text-lg font-black text-accent-premium">{top.teamId}</div>
        </div>
        <div className="text-[10px] text-fg-tertiary mt-0.5">
          {Number(top.championProb).toFixed(2)}% probabilidad · {isMonteCarlo ? `${top.simulationsCount}/${top.totalSimulations} sim` : 'Elo Rating'}
        </div>
        {/* Podium row from bracket */}
        {projectedChampion && projectedChampion.runnerUp && (
          <div className="mt-2 flex items-center justify-center gap-3 text-[11px]">
            {projectedChampion.thirdPlace && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-overlay text-fg-secondary font-semibold border border-border-subtle">
                <span>{getFlag(projectedChampion.thirdPlace)}</span>
                <span>🥉 {projectedChampion.thirdPlace}</span>
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-overlay text-fg-secondary font-semibold border border-border-subtle">
              <span>{getFlag(projectedChampion.runnerUp)}</span>
              <span>🥈 {projectedChampion.runnerUp}</span>
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-border-subtle mb-3" />

      {/* Top 8 bars */}
      <div className="relative space-y-1.5">
        {probs.map((p, i) => (
          <motion.div
            key={p.teamId}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="flex items-center gap-2"
          >
            <span className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
              i === 0 ? "bg-[var(--medal-gold)] text-canvas font-bold" :
              i === 1 ? "bg-[var(--medal-silver)] text-canvas font-bold" :
              i === 2 ? "bg-[var(--medal-bronze)] text-canvas font-bold" :
              "bg-raised text-fg-disabled"
            )}>
              {i + 1}
            </span>
            <span className="text-[10px] shrink-0">{getFlag(p.teamId)}</span>
            <span className="text-[11px] font-semibold text-fg-primary w-16 truncate shrink-0">{p.teamId}</span>
            <div className="flex-1 h-2.5 bg-raised/50 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${(p.championProb / maxProb) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
                style={{
                  background:
                    i === 0 ? 'var(--medal-gold)' :
                    i === 1 ? 'var(--medal-silver)' :
                    i === 2 ? 'var(--medal-bronze)' :
                    'var(--text-disabled)',
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-accent-premium w-12 text-right shrink-0 font-mono tabular-nums">
              {Number(p.championProb).toFixed(2)}%
            </span>
          </motion.div>
        ))}
      </div>

      <p className="text-[9px] text-fg-disabled text-center mt-3">
        {isMonteCarlo ? '100 simulaciones Monte Carlo' : 'Rating Elo Determinístico'} · Motor Poisson + Elo + xG · Auto-ajuste con resultados reales
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
