'use client';

import { useState, useRef, useEffect } from 'react';
import { TEAM_NAMES } from '@/lib/teams';
import { getTeamFlag } from '@/lib/matches';

interface TeamSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabledTeam?: string;
}

export default function TeamSelector({ value, onChange, label, disabledTeam }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredTeams = TEAM_NAMES.filter(
    (team) =>
      team.toLowerCase().includes(search.toLowerCase()) &&
      team !== disabledTeam
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const flag = value ? getTeamFlag(value) : '';

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-[11px] font-semibold text-fg-secondary uppercase tracking-wider mb-2">
        {label}
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left
                   hover:border-white/[0.15] focus:border-accent-premium/50 focus:outline-none transition-all
                   flex items-center justify-between"
      >
        <span className={value ? 'text-white text-sm font-medium' : 'text-fg-disabled text-sm'}>
          {flag ? `${flag} ${value}` : value || 'Seleccionar equipo...'}
        </span>
        <svg
          className={`w-4 h-4 text-fg-disabled transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-overlay/95 border border-white/[0.08] rounded-xl shadow-2xl
                        backdrop-blur-2xl max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-white/[0.06]">
            <input
              type="text"
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white text-sm
                         placeholder-text-muted focus:outline-none focus:border-accent-premium/30"
              autoFocus
            />
          </div>

          {/* Team list */}
          <div className="overflow-y-auto max-h-48">
            {filteredTeams.map((team) => {
              const teamFlag = getTeamFlag(team);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    const cleanName = team.includes(' ') ? team.slice(team.indexOf(' ') + 1) : team;
                    onChange(cleanName);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-fg-primary hover:bg-white/[0.06] transition-colors
                             flex items-center gap-2.5"
                >
                  <span className="text-base">{teamFlag}</span>
                  <span className="font-medium">{team}</span>
                </button>
              );
            })}
            {filteredTeams.length === 0 && (
              <div className="px-4 py-4 text-fg-disabled text-sm text-center">Sin resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
