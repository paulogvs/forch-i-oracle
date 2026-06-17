'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WORLD_CUP_TEAMS, ELO_RATINGS, POWER_RATINGS, type Team } from '@/lib/teams';
import { WC2026_VENUES } from '@/lib/venues';
import { useLiveScores } from '@/lib/swr/hooks';
import { Badge } from '@/components/ui/Badge';
import { Zap, Activity, TrendingUp, Sparkles, Users, BarChart3, Target, LayoutDashboard } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

type ConfederationFilter = 'all' | 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC';
type GroupFilter = 'all' | string;

interface TeamStats {
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getConfederationAccent(conf: string): string {
  const accents: Record<string, string> = {
    UEFA: 'text-accent-primary',
    CONMEBOL: 'text-accent-emerald',
    CONCACAF: 'text-accent-premium',
    CAF: 'text-accent-premium',
    AFC: 'text-state-danger',
    OFC: 'text-accent-secondary',
  };
  return accents[conf] || 'text-fg-secondary';
}

function getConfederationSurface(conf: string): string {
  const surfaces: Record<string, string> = {
    UEFA: 'surface-blue',
    CONMEBOL: 'surface-live',
    CONCACAF: 'surface-gold',
    CAF: 'surface-gold',
    AFC: 'surface-danger',
    OFC: 'surface-violet',
  };
  return surfaces[conf] || 'surface';
}

function getConfederationBadge(conf: string): string {
  const badges: Record<string, string> = {
    UEFA: '🇪🇺',
    CONMEBOL: '🌎',
    CONCACAF: '🏆',
    CAF: '🌍',
    AFC: '🌏',
    OFC: '🌊',
  };
  return badges[conf] || '⚽';
}

function getEloTier(elo: number): { label: string; color: string } {
  if (elo >= 2100) return { label: 'Élite', color: 'text-accent-premium' };
  if (elo >= 2000) return { label: 'Top', color: 'text-accent-primary' };
  if (elo >= 1900) return { label: 'Competitivo', color: 'text-accent-emerald' };
  if (elo >= 1800) return { label: 'Promedio', color: 'text-fg-secondary' };
  return { label: 'Revelación', color: 'text-state-warning' };
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [confFilter, setConfFilter] = useState<ConfederationFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: liveData } = useLiveScores<{ success: boolean; finished: any[] }>();

  // Compute live stats
  const teamStats = useMemo(() => {
    const stats = new Map<string, TeamStats>();
    for (const t of WORLD_CUP_TEAMS) {
      stats.set(t.name, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    }
    if (liveData?.finished) {
      for (const m of liveData.finished) {
        const home = stats.get(m.homeTeam);
        const away = stats.get(m.awayTeam);
        if (!home || !away) continue;
        home.played++; away.played++;
        home.gf += m.homeScore; home.ga += m.awayScore;
        away.gf += m.awayScore; away.ga += m.homeScore;
        home.gd = home.gf - home.ga;
        away.gd = away.gf - away.ga;
        if (m.homeScore > m.awayScore) { home.won++; home.points += 3; away.lost++; }
        else if (m.homeScore < m.awayScore) { away.won++; away.points += 3; home.lost++; }
        else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
      }
    }
    return stats;
  }, [liveData]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return WORLD_CUP_TEAMS.filter((t) => {
      if (confFilter !== 'all' && t.confederation !== confFilter) return false;
      if (groupFilter !== 'all' && t.group !== groupFilter) return false;
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.englishName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !t.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [confFilter, groupFilter, searchQuery]);

  // Group by confederation
  const groupedByConf = useMemo(() => {
    const groups = new Map<string, Team[]>();
    for (const t of filteredTeams) {
      if (!groups.has(t.confederation)) groups.set(t.confederation, []);
      groups.get(t.confederation)!.push(t);
    }
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filteredTeams]);

  return (
    <div className="max-w-6xl mx-auto space-y-4 animate-fade">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="h-page text-accent-premium flex items-center justify-center gap-2">
          <Users className="w-8 h-8" /> 48 Equipos
        </h1>
        <p className="t-meta mt-2">
          Mundial FIFA 2026 — {filteredTeams.length} equipos
        </p>
      </motion.div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar equipo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface backdrop-blur-xl border border-border-subtle rounded-xl px-4 py-3 pl-10 t-body focus:outline-none focus:border-border-focus transition-colors"
          />
          <BarChart3 className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
        </div>

        {/* Confederation filter */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'] as ConfederationFilter[]).map((c) => (
            <button
              key={c}
              onClick={() => setConfFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                confFilter === c
                  ? `${getConfederationSurface(c)} ${getConfederationAccent(c)}`
                  : 'bg-surface text-fg-tertiary border border-border-subtle hover:text-fg-secondary'
              }`}
            >
              {c === 'all' ? '🌐 Todos' : `${getConfederationBadge(c)} ${c}`}
            </button>
          ))}
        </div>

        {/* Group filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setGroupFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
              groupFilter === 'all'
                ? 'surface-blue text-accent-primary border-accent-primary/20'
                : 'text-fg-tertiary border-border-subtle hover:text-fg-secondary'
            }`}
          >
            Todos
          </button>
          {['A','B','C','D','E','F','G','H','I','J','K','L'].map((g) => (
            <button
              key={g}
              onClick={() => setGroupFilter(g)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                groupFilter === g
                  ? 'surface-blue text-accent-primary border-accent-primary/20'
                  : 'text-fg-tertiary border-border-subtle hover:text-fg-secondary'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Teams Grid */}
      <div className="max-w-6xl mx-auto">
        {groupedByConf.map(([conf, teams]) => (
          <div key={conf} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{getConfederationBadge(conf)}</span>
              <h2 className="h-section">{conf}</h2>
              <span className="t-micro">({teams.length})</span>
              <div className="flex-1 h-px bg-border-subtle ml-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {teams.map((team, i) => (
                <TeamCard
                  key={team.name}
                  team={team}
                  stats={teamStats.get(team.name)}
                  index={i}
                  onClick={() => setSelectedTeam(team)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Team Detail Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <TeamDetailModal
            team={selectedTeam}
            stats={teamStats.get(selectedTeam.name)}
            onClose={() => setSelectedTeam(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────

function TeamCard({ team, stats, index, onClick }: {
  team: Team; stats?: TeamStats; index: number; onClick: () => void;
}) {
  const elo = ELO_RATINGS[team.name]?.elo || 1500;
  const tier = getEloTier(elo);
  const power = POWER_RATINGS[team.name];
  const avgPower = power ? Math.round((power.attack + power.defense + power.midfield) / 3) : 50;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="group text-left p-4 surface-interactive"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-3xl group-hover:scale-110 transition-transform">{team.flag}</span>
          <div>
            <div className="h-card group-hover:text-accent-primary transition-colors">{team.name}</div>
            <div className="t-micro">{team.englishName}</div>
          </div>
        </div>
        <span className={`t-body font-bold ${tier.color}`}>{elo}</span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="neutral">{team.group}</Badge>
        <Badge variant="neutral">{team.code}</Badge>
        {stats && stats.played > 0 && (
          <Badge variant="success">{stats.points}pts</Badge>
        )}
      </div>

      {/* Power bar */}
      <div className="mb-3">
        <div className="flex justify-between t-micro mb-1">
          <span>Poder</span>
          <span>{avgPower}/100</span>
        </div>
        <div className="w-full bg-elevated rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${getConfederationAccent(team.confederation)}`}
            style={{ width: `${avgPower}%`, opacity: 0.6 }}
          />
        </div>
      </div>

      {/* Star players */}
      <div className="t-micro">
        <Sparkles className="w-3 h-3 inline text-fg-secondary" /> {team.starPlayers.slice(0, 2).join(', ')}
      </div>
    </motion.button>
  );
}

// ─── Team Detail Modal ────────────────────────────────────────────────────

function TeamDetailModal({ team, stats, onClose }: {
  team: Team; stats?: TeamStats; onClose: () => void;
}) {
  const elo = ELO_RATINGS[team.name]?.elo || 1500;
  const tier = getEloTier(elo);
  const power = POWER_RATINGS[team.name] || { attack: 50, defense: 50, midfield: 50 };
  const eloData = ELO_RATINGS[team.name];

  // Find venues (random selection for demo)
  const venues = Object.values(WC2026_VENUES).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full sm:max-w-lg bg-canvas border border-border-subtle rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 ${getConfederationSurface(team.confederation)}`}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-lg bg-overlay text-fg-tertiary hover:text-fg-primary transition-colors">
            ✕
          </button>
          <div className="flex items-center gap-4">
            <span className="text-6xl">{team.flag}</span>
            <div>
              <h2 className="h-page">{team.name}</h2>
              <div className="t-meta">{team.englishName}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="neutral">{team.code}</Badge>
                <Badge variant="neutral">{team.group}</Badge>
                <Badge variant={elo >= 2100 ? 'premium' : elo >= 2000 ? 'info' : elo >= 1900 ? 'live' : 'neutral'}>
                  {elo} Elo
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          {stats && stats.played > 0 && (
            <div>
              <h3 className="t-micro mb-3">📊 Estadísticas en Vivo</h3>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'PJ', value: stats.played },
                  { label: 'G', value: stats.won, color: 'text-state-success' },
                  { label: 'E', value: stats.drawn, color: 'text-state-warning' },
                  { label: 'P', value: stats.lost, color: 'text-state-danger' },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 rounded-lg surface">
                    <div className={`text-lg font-black ${s.color || 'text-fg-primary'}`}>{s.value}</div>
                    <div className="t-micro">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="text-center p-2 rounded-lg surface">
                  <div className="text-lg font-black text-fg-primary">{stats.gf}</div>
                  <div className="t-micro">GF</div>
                </div>
                <div className="text-center p-2 rounded-lg surface">
                  <div className="text-lg font-black text-fg-primary">{stats.ga}</div>
                  <div className="t-micro">GC</div>
                </div>
                <div className="text-center p-2 rounded-lg surface">
                  <div className={`text-lg font-black ${stats.gd > 0 ? 'text-state-success' : stats.gd < 0 ? 'text-state-danger' : 'text-fg-secondary'}`}>
                    {stats.gd > 0 ? '+' : ''}{stats.gd}
                  </div>
                  <div className="t-micro">DG</div>
                </div>
              </div>
            </div>
          )}

          {/* Power ratings */}
          <div>
            <h3 className="t-micro mb-3"><Zap className="w-4 h-4 inline" /> Ratings de Poder</h3>
            <div className="space-y-3">
              {[
                { label: 'Ataque', value: power.attack, icon: Zap },
                { label: 'Medio Campo', value: power.midfield, icon: Target },
                { label: 'Defensa', value: power.defense, icon: LayoutDashboard },
              ].map((p) => (
                <div key={p.label}>
                  <div className="flex justify-between t-body mb-1">
                    <span className="flex items-center gap-1"><p.icon className="w-4 h-4" /> {p.label}</span>
                    <span className="font-bold">{p.value}/100</span>
                  </div>
                  <div className="w-full bg-elevated rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getConfederationAccent(team.confederation)}`}
                      style={{ width: `${p.value}%`, opacity: 0.6 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Elo details */}
          {eloData && (
            <div>
              <h3 className="t-micro mb-3"><TrendingUp className="w-4 h-4 inline" /> Elo Rating</h3>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 rounded-lg surface">
                  <div className="text-xl font-black text-accent-primary">{elo}</div>
                  <div className="t-micro">Elo</div>
                </div>
                <div className="text-center p-3 rounded-lg surface">
                  <div className="text-xl font-black text-accent-emerald">{eloData.attack}</div>
                  <div className="t-micro">Ataque avg</div>
                </div>
                <div className="text-center p-3 rounded-lg surface">
                  <div className="text-xl font-black text-state-danger">{eloData.defense}</div>
                  <div className="t-micro">Defensa avg</div>
                </div>
              </div>
            </div>
          )}

          {/* Star players */}
          <div>
            <h3 className="t-micro mb-3"><Sparkles className="w-4 h-4 inline" /> Jugadores Estrella</h3>
            <div className="flex flex-wrap gap-2">
              {team.starPlayers.map((p) => (
                <Badge key={p} variant="neutral" className="text-sm">{p}</Badge>
              ))}
            </div>
          </div>

          {/* Confederation */}
          <div className="flex items-center justify-between p-3 surface">
            <div className="flex items-center gap-2">
              <span>{getConfederationBadge(team.confederation)}</span>
              <span className="t-body font-semibold">{team.confederation}</span>
            </div>
            <Badge variant={elo >= 2100 ? 'premium' : elo >= 2000 ? 'info' : elo >= 1900 ? 'live' : 'neutral'}>
              {tier.label}
            </Badge>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
