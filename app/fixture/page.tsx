'use client';

import { useState, useEffect } from 'react';
import { ALL_MATCHES } from '@/lib/matches';
import { getTeamByName, ELO_RATINGS, POWER_RATINGS } from '@/lib/teams';
import { utcToLocal, getUserTimezoneOffset, getTimezoneLabel, TIMEZONE_PRESETS } from '@/lib/timezone';
import { cn } from '@/lib/utils';
import MatchSeal, { computeSealStatus } from '@/components/MatchSeal';
import { AnimatedCheck, AnimatedX, AnimatedZap, AnimatedClock, AnimatedLiveDot } from '@/components/icons/animated-icons';
import { motion, AnimatePresence } from 'motion/react';
import { FixtureSkeleton } from '@/components/LoadingSkeleton';
import { createSmartInterval } from '@/lib/smart-refresh';

type MainTab = 'partidos' | 'tablas' | 'top8' | 'bracket';
type PhaseFilter = string;
type MatchStatus = 'exact' | 'winner_ok' | 'wrong' | 'upcoming';

interface FixtureMatch {
  id: string; group: string; date: string; time: string; homeTeam: string; awayTeam: string;
  venue: string; city: string; round: string; homeGoals: number | null; awayGoals: number | null;
  homeWin: number | null; draw: number | null; awayWin: number | null; confidence: string | null;
  topScores: { home: number; away: number; probability: number }[] | null;
  isPredicted: boolean; extraTime?: boolean; penalties?: boolean;
  analysis?: string; homeKeyPlayers?: string[]; awayKeyPlayers?: string[];
}

interface RealResult { matchId: string; homeScore: number; awayScore: number; winner: string; }

export default function FixturePage() {
  const [mainTab, setMainTab] = useState<MainTab>('partidos');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [fixtures, setFixtures] = useState<FixtureMatch[]>([]);
  const [realResults, setRealResults] = useState<Map<string, RealResult>>(new Map());
  const [top8, setTop8] = useState<any[]>([]);
  const [bracket, setBracket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<FixtureMatch | null>(null);
  const [tzOffset, setTzOffset] = useState<number>(-4);
  const [liveStandings, setLiveStandings] = useState<Record<string, any[]>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => { setTzOffset(getUserTimezoneOffset()); loadAll(); }, []);
  useEffect(() => { return createSmartInterval(loadAll); }, []);

  const loadAll = async () => {
    setLoading(true); setError('');
    try {
      const [fixtureRes, simRes, liveRes] = await Promise.all([
        fetch('/api/fixture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ useEnhanced: true }) }),
        fetch('/api/simulate-tournament'),
        fetch('/api/live-scores'),
      ]);
      const fixtureData = await fixtureRes.json();
      const simData = await simRes.json();
      const liveData = await liveRes.json().catch(() => ({ success: false }));

      if (fixtureData.success) {
        setFixtures((fixtureData.fixture || []).map((m: any) => ({
          id: m.id, group: m.group || 'KO', date: m.date, time: m.time || '',
          homeTeam: m.homeTeam, awayTeam: m.awayTeam, venue: m.venue || '', city: m.city || '',
          round: m.round, homeGoals: m.predictedScore?.[0] ?? null, awayGoals: m.predictedScore?.[1] ?? null,
          homeWin: m.homeWinPct ?? null, draw: m.drawPct ?? null, awayWin: m.awayWinPct ?? null,
          confidence: m.confidence ?? null, topScores: m.topScores ?? null,
          isPredicted: m.predictedScore !== null, extraTime: false, penalties: false,
          analysis: m.analysis || '', homeKeyPlayers: m.homeKeyPlayers || [], awayKeyPlayers: m.awayKeyPlayers || [],
        })));
        setLastUpdated(new Date());
      }

      const resultsMap = new Map<string, RealResult>();
      if (simData.success && simData.results) for (const r of simData.results) resultsMap.set(r.matchId, r);
      if (liveData.success && liveData.finished) {
        for (const m of liveData.finished) {
          const match = ALL_MATCHES.find(am => am.homeTeam === m.homeTeam && am.awayTeam === m.awayTeam);
          if (match) resultsMap.set(match.id, { matchId: match.id, homeScore: m.homeScore, awayScore: m.awayScore, winner: m.homeScore > m.awayScore ? m.homeTeam : m.awayScore > m.homeScore ? m.awayTeam : 'draw' });
        }
      }
      setRealResults(resultsMap);
      if (simData.success) { setTop8(simData.top8 || []); setBracket(simData.bracket); setLiveStandings(simData.liveStandings || {}); }
    } catch (err) { setError('Error cargando datos'); }
    finally { setLoading(false); }
  };

  const MAIN_TABS = [
    { id: 'partidos' as const, label: 'Partidos', emoji: '⚽' },
    { id: 'tablas' as const, label: 'Tablas', emoji: '📊' },
    { id: 'top8' as const, label: 'Top 8', emoji: '🏆' },
    { id: 'bracket' as const, label: 'Bracket', emoji: '📐' },
  ];
  const PHASES = [
    { id: 'all', label: 'Todos' }, { id: 'group', label: 'Grupos' },
    { id: 'round-32', label: '1/16' }, { id: 'round-16', label: '1/8' },
    { id: 'quarter', label: '1/4' }, { id: 'semi', label: 'Semis' }, { id: 'final', label: 'Final' },
  ];

  const filtered = phaseFilter === 'all' ? fixtures : fixtures.filter(m => m.round === phaseFilter);
  const getRoundLabel = (r: string) => ({ group:'Fase de Grupos','round-32':'1/16 Final','round-16':'Octavos',quarter:'Cuartos',semi:'Semifinales',third:'Tercer Puesto',final:'Final' }[r] || r);
  const getFlag = (n: string) => getTeamByName(n)?.flag || '❓';
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

  // Compute match status
  function getMatchStatus(match: FixtureMatch, result?: RealResult): MatchStatus {
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

      <div className="flex gap-1 p-1 bg-elevated rounded-[var(--r-xl)] mb-4 border border-border-subtle">
        {MAIN_TABS.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)} className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[var(--r-lg)] text-xs font-semibold transition-all",
            mainTab === t.id ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/25" : "text-fg-secondary hover:text-fg-primary hover:bg-raised/50"
          )}><span>{t.emoji}</span><span className="hidden sm:inline">{t.label}</span></button>
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

      {loading && <FixtureSkeleton />}
      {error && <div className="surface-danger p-5 text-center rounded-[var(--r-lg)]"><p className="text-state-danger text-sm">{error}</p></div>}

      {/* PARTIDOS */}
      {!loading && !error && mainTab === 'partidos' && (
        <div className="space-y-5">
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
        </div>
      )}

      {!loading && !error && mainTab === 'tablas' && <TablasTab liveStandings={liveStandings} getFlag={getFlag} />}
      {!loading && !error && mainTab === 'top8' && <Top8Tab top8={top8} getFlag={getFlag} />}
      {!loading && !error && mainTab === 'bracket' && bracket && <BracketTab bracket={bracket} getFlag={getFlag} />}

      {selectedMatch && (
        <MatchDetailModal match={selectedMatch} realResult={realResults.get(selectedMatch.id)} status={getMatchStatus(selectedMatch, realResults.get(selectedMatch.id))} getFlag={getFlag} getRoundLabel={getRoundLabel} onClose={() => setSelectedMatch(null)} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COLOR PALETTES BY STATUS
// ═══════════════════════════════════════════════════════════════
const PALETTES = {
  upcoming: {
    card: 'bg-[#1A1D24] border-[#2A2D35]',
    scoreBg: 'bg-[#2A2D35]',
    scoreText: 'text-[#6B7280]',
    predText: 'text-[#9CA3AF]',
    teamText: 'text-[#9CA3AF]',
    teamWinner: 'text-[#9CA3AF]',
    icon: <AnimatedClock className="text-[#6B7280]" size={14} />,
  },
  exact: {
    card: 'bg-[#052E16] border-[#166534]',
    scoreBg: 'bg-[#166534]',
    scoreText: 'text-[#4ADE80]',
    predText: 'text-[#86EFAC]',
    teamText: 'text-[#BBF7D0]',
    teamWinner: 'text-[#4ADE80]',
    icon: <AnimatedCheck className="text-[#4ADE80]" size={16} />,
  },
  winner_ok: {
    card: 'bg-[#14291E] border-[#1B6B3A]',
    scoreBg: 'bg-[#1B6B3A]',
    scoreText: 'text-[#FACC15]',  // YELLOW for score (wrong but winner correct)
    predText: 'text-[#86EFAC]',
    teamText: 'text-[#BBF7D0]',
    teamWinner: 'text-[#4ADE80]',
    icon: <AnimatedCheck className="text-[#4ADE80]" size={16} />,
  },
  wrong: {
    card: 'bg-[#2A0A0A] border-[#991B1B]',
    scoreBg: 'bg-[#991B1B]',
    scoreText: 'text-[#FCA5A5]',
    predText: 'text-[#FCA5A5]',
    teamText: 'text-[#FECACA]',
    teamWinner: 'text-[#FCA5A5]',
    icon: <AnimatedX className="text-[#FCA5A5]" size={16} />,
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
  const realWinner = result ? (result.homeScore > result.awayScore ? 'home' : result.homeScore < result.awayScore ? 'away' : 'draw') : null;

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
          {isPlayed && result ? (
            <div className={cn("px-3 py-1 rounded-[var(--r-md)]", pal.scoreBg)}>
              <span className={cn("font-mono font-bold text-base tabular-nums", pal.scoreText)}>
                {result.homeScore} - {result.awayScore}
              </span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-[var(--r-md)] bg-[#2A2D35]">
              <span className="font-mono font-bold text-base tabular-nums text-[#4B5563]">TBD</span>
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
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1">
            <AnimatedZap size={10} className="text-[#9CA3AF]" />
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
  const hasData = Object.keys(liveStandings).length > 0 && Object.values(liveStandings).some((g: any) => g.some((t: any) => t.played > 0));
  if (!hasData) return <div className="p-8 text-center rounded-[var(--r-lg)] bg-[#1A1D24] border border-[#2A2D35]"><p className="text-xs text-[#6B7280]">🏆 Las tablas de posiciones se actualizarán con los primeros resultados</p></div>;
  return (
    <div className="space-y-3">
      {Object.entries(liveStandings).map(([group, teams]) => {
        if (!(teams as any[]).some((t: any) => t.played > 0)) return null;
        return (
          <div key={group} className="p-4 rounded-[var(--r-lg)] bg-[#0C1017] border border-[#2A2D35]">
            <h4 className="text-xs font-bold text-accent-premium uppercase mb-2">Grupo {group}</h4>
            <table className="w-full text-xs">
              <thead><tr className="text-[#6B7280] text-[10px]"><th className="text-left pb-1.5 w-5">#</th><th className="text-left pb-1.5">Equipo</th><th className="text-center pb-1.5">PJ</th><th className="text-center pb-1.5">DG</th><th className="text-center pb-1.5">Pts</th></tr></thead>
              <tbody>{(teams as any[]).map((t: any, i: number) => (
                <tr key={t.name} className={cn(i < 2 ? 'bg-[#052E16]/40' : '', 'border-t border-[#2A2D35]')}>
                  <td className="py-1.5 text-[#6B7280]">{i + 1}</td>
                  <td className="py-1.5"><div className="flex items-center gap-1.5"><span className="text-sm">{getFlag(t.name)}</span><span className={cn("truncate max-w-[70px]", i < 2 ? "font-semibold text-[#BBF7D0]" : "text-[#9CA3AF]")}>{t.name}</span></div></td>
                  <td className="py-1.5 text-center text-[#6B7280]">{t.played}</td>
                  <td className={cn("py-1.5 text-center font-mono text-[11px]", t.gd > 0 ? "text-[#4ADE80]" : t.gd < 0 ? "text-[#FCA5A5]" : "text-[#6B7280]")}>{t.gd > 0 ? '+' : ''}{t.gd}</td>
                  <td className="py-1.5 text-center font-bold text-fg-primary">{t.points}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function Top8Tab({ top8, getFlag }: { top8: any[]; getFlag: (n: string) => string }) {
  if (!top8?.length) return <div className="p-8 text-center rounded-[var(--r-lg)] bg-[#1A1D24] border border-[#2A2D35]"><p className="text-xs text-[#6B7280]">🏆 Top 8 se calculará con las simulaciones del torneo</p></div>;
  return (
    <div className="space-y-2">
      {top8.slice(0, 8).map((team: any, i: number) => (
        <div key={team.name || team} className={cn("flex items-center gap-3 p-3 rounded-[var(--r-lg)] border", i < 4 ? "bg-[#1A1705] border-[#854D0E]" : "bg-[#1A1D24] border-[#2A2D35]")}>
          <span className={cn("w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0", i === 0 ? "bg-[#854D0E]/30 text-[#E2B340]" : "bg-[#2A2D35] text-[#6B7280]")}>{i + 1}</span>
          <span className="text-lg shrink-0">{getFlag(team.name || team)}</span>
          <span className="text-sm font-bold text-fg-primary flex-1">{team.name || team}</span>
          {team.probability !== undefined && <span className="text-[10px] text-[#6B7280] font-mono">{team.probability}%</span>}
        </div>
      ))}
    </div>
  );
}

function BracketTab({ bracket, getFlag }: { bracket: any; getFlag: (n: string) => string }) {
  if (!bracket) return <div className="p-8 text-center rounded-[var(--r-lg)] bg-[#1A1D24] border border-[#2A2D35]"><p className="text-xs text-[#6B7280]">📐 El bracket se generará con las simulaciones del torneo</p></div>;
  return (
    <div className="space-y-4">
      {bracket.roundOf32?.length > 0 && <BracketRound title="1/16" matches={bracket.roundOf32} getFlag={getFlag} />}
      {bracket.roundOf16?.length > 0 && <BracketRound title="Octavos" matches={bracket.roundOf16} getFlag={getFlag} />}
      {bracket.quarters?.length > 0 && <BracketRound title="Cuartos" matches={bracket.quarters} getFlag={getFlag} />}
      {bracket.semis?.length > 0 && <BracketRound title="Semis" matches={bracket.semis} getFlag={getFlag} />}
      {bracket.final && (
        <div className="p-5 text-center rounded-[var(--r-lg)] bg-[#1A1705] border border-[#854D0E]">
          <div className="text-2xl mb-1">🏆</div>
          <div className="text-base font-bold text-[#E2B340]">{bracket.champion || 'Por definir'}</div>
          <div className="text-[10px] text-[#6B7280]">Campeón Simulado</div>
        </div>
      )}
    </div>
  );
}

function BracketRound({ title, matches, getFlag }: { title: string; matches: any[]; getFlag: (n: string) => string }) {
  return (
    <div>
      <h4 className="text-[11px] font-bold text-[#6B7280] uppercase mb-2">{title}</h4>
      <div className="space-y-1.5">
        {matches.map((m: any) => m && (
          <div key={m.id} className="flex items-center justify-between p-2.5 rounded-[var(--r-md)] bg-[#1A1D24] border border-[#2A2D35] text-xs">
            <div className="flex items-center gap-1.5 min-w-0"><span>{getFlag(m.homeTeam)}</span><span className="truncate">{m.homeTeam}</span></div>
            <span className="font-mono font-bold text-fg-tertiary">{m.homeScore ?? '—'} - {m.awayScore ?? '—'}</span>
            <div className="flex items-center gap-1.5 min-w-0 justify-end"><span className="truncate text-right">{m.awayTeam}</span><span>{getFlag(m.awayTeam)}</span></div>
          </div>
        ))}
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
  const realWinner = realResult ? (realResult.homeScore > realResult.awayScore ? 'home' : realResult.homeScore < realResult.awayScore ? 'away' : 'draw') : null;
  const seal = (isPlayed && match.homeGoals !== null && realResult) ? computeSealStatus(match.homeGoals, match.awayGoals!, realResult.homeScore, realResult.awayScore) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full sm:max-w-md bg-[#0C1017] border border-[#2A2D35] rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-10 p-1.5 rounded-[var(--r-md)] bg-[#2A2D35] text-[#6B7280]"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>

        <div className="p-5">
          <div className="text-[10px] text-accent-primary font-semibold uppercase tracking-wider mb-4">
            {match.round === 'group' ? `Grupo ${match.group}` : getRoundLabel(match.round)}
          </div>

          {/* Teams + Score */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">{getFlag(match.homeTeam)}</div>
              <div className={cn("text-xs font-bold", isPlayed && realWinner === 'home' ? pal.teamWinner : "text-fg-primary")}>{match.homeTeam}</div>
              <div className="text-[10px] text-[#6B7280]">Elo {homeElo}</div>
            </div>

            <div className="text-center">
              {isPlayed && realResult ? (
                <div className="flex flex-col items-center gap-1">
                  {/* Real score — TOP, big */}
                  <div className={cn("px-4 py-2 rounded-[var(--r-md)]", pal.scoreBg)}>
                    <div className={cn("text-2xl font-bold font-mono tabular-nums", pal.scoreText)}>{realResult.homeScore} - {realResult.awayScore}</div>
                  </div>
                  {/* Predicted — BOTTOM, small */}
                  {match.homeGoals !== null && match.awayGoals !== null && (
                    <div className="text-[11px] text-[#6B7280] font-mono mt-1">Pred: <span className={pal.predText}>{match.homeGoals}-{match.awayGoals}</span></div>
                  )}
                  {/* Status badge */}
                  <span className="mt-1">{pal.icon}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  {/* TBD — big */}
                  <div className="px-4 py-2 rounded-[var(--r-md)] bg-[#2A2D35]">
                    <div className="text-2xl font-bold font-mono tabular-nums text-[#4B5563]">TBD</div>
                  </div>
                  {/* Predicted — small */}
                  {match.homeGoals !== null && match.awayGoals !== null && (
                    <div className="text-[11px] text-[#9CA3AF] font-mono mt-1">Pred: <span className="text-accent-primary">{match.homeGoals}-{match.awayGoals}</span></div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 text-center">
              <div className="text-2xl mb-1">{getFlag(match.awayTeam)}</div>
              <div className={cn("text-xs font-bold", isPlayed && realWinner === 'away' ? pal.teamWinner : "text-fg-primary")}>{match.awayTeam}</div>
              <div className="text-[10px] text-[#6B7280]">Elo {awayElo}</div>
            </div>
          </div>

          {seal && <div className="flex justify-center mb-4"><MatchSeal dual winnerStatus={seal.winnerStatus} scoreStatus={seal.scoreStatus} /></div>}

          {/* Probabilities */}
          {match.homeWin !== null && (
            <div className="pt-3 border-t border-[#2A2D35]">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">Probabilidades</div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-1">
                <div style={{ width: `${match.homeWin}%` }} className="bg-accent-primary/70" />
                <div style={{ width: `${match.draw}%` }} className="bg-[#6B7280]/30" />
                <div style={{ width: `${match.awayWin}%` }} className="bg-state-danger/70" />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-accent-primary font-semibold">{match.homeWin}%</span>
                <span className="text-[#6B7280]">{match.draw}%</span>
                <span className="text-state-danger font-semibold">{match.awayWin}%</span>
              </div>
            </div>
          )}

          {/* ═══ DRIFT — Prediction vs Reality ═══ */}
          {isPlayed && realResult && match.homeGoals !== null && match.awayGoals !== null && (() => {
            const maeHome = Math.abs(match.homeGoals - realResult.homeScore);
            const maeAway = Math.abs(match.awayGoals - realResult.awayScore);
            const totalMae = (maeHome + maeAway) / 2;
            const driftColor = totalMae < 0.5 ? 'bg-[#166534] text-[#4ADE80]' : totalMae <= 1 ? 'bg-[#854D0E] text-[#FACC15]' : 'bg-[#991B1B] text-[#FCA5A5]';
            const driftLabel = totalMae < 0.5 ? 'Muy cercana' : totalMae <= 1 ? 'Cercana' : 'Lejana';
            return (
              <div className="pt-3 mt-3 border-t border-[#2A2D35]">
                <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">Drift de Predicción</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-[#6B7280] mb-1">Predicción</div>
                    <div className="px-3 py-1.5 bg-[#2A2D35] rounded-[var(--r-md)]">
                      <span className="font-mono font-bold text-sm text-[#9CA3AF]">{match.homeGoals}-{match.awayGoals}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">→</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold", driftColor)}>{driftLabel}</span>
                    <span className="text-[9px] text-[#6B7280] font-mono">MAE {totalMae.toFixed(1)}</span>
                  </div>
                  <div className="flex-1 text-center">
                    <div className="text-[10px] text-[#6B7280] mb-1">Real</div>
                    <div className="px-3 py-1.5 bg-[#2A2D35] rounded-[var(--r-md)]">
                      <span className={cn("font-mono font-bold text-sm", pal.scoreText)}>{realResult.homeScore}-{realResult.awayScore}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Stats */}
          <div className="pt-3 mt-3 border-t border-[#2A2D35]">
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">Comparación</div>
            {['attack', 'midfield', 'defense'].map(stat => {
              const h = homePower[stat as keyof typeof homePower]; const a = awayPower[stat as keyof typeof awayPower];
              const l: Record<string, string> = { attack: 'Ataque', midfield: 'Medio', defense: 'Defensa' };
              return (
                <div key={stat} className="mb-1.5">
                  <div className="flex justify-between text-[10px] mb-0.5"><span className="text-accent-primary">{h}</span><span className="text-[#6B7280]">{l[stat]}</span><span className="text-state-danger">{a}</span></div>
                  <div className="flex h-1.5 rounded-full overflow-hidden"><div className="bg-accent-primary/60" style={{ width: `${(h/(h+a))*100}%` }} /><div className="bg-state-danger/60" style={{ width: `${(a/(h+a))*100}%` }} /></div>
                </div>
              );
            })}
          </div>

          {/* Likely scores */}
          {match.topScores?.length && (
            <div className="pt-3 mt-3 border-t border-[#2A2D35]">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold mb-2">Marcadores Probables</div>
              <div className="space-y-1">
                {match.topScores.slice(0, 4).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#6B7280] w-3">{i+1}</span>
                    <span className="font-mono font-bold text-fg-primary w-7">{s.home}-{s.away}</span>
                    <div className="flex-1 h-1.5 bg-[#2A2D35] rounded-full overflow-hidden"><div className="h-full bg-accent-premium/40 rounded-full" style={{ width: `${Math.min(100, s.probability*3)}%` }} /></div>
                    <span className="text-[#6B7280] w-8 text-right">{s.probability}%</span>
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
