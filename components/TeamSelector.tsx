'use client';

import { useState, useRef, useEffect } from 'react';
import { TEAM_NAMES } from '@/lib/teams';

interface TeamSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabledTeam?: string;
}

export default function TeamSelector({ value, onChange, label, disabledTeam }: TeamSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLDivElement>(null);

  const filteredTeams = TEAM_NAMES.filter(
    (team) =>
      team.toLowerCase().includes(search.toLowerCase()) &&
      team !== disabledTeam
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDisplay = value || 'Seleccionar equipo...';

  return (
    <div className="relative w-full" ref={inputRef}>
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-left text-white
                   hover:border-forch-gold/50 focus:border-forch-gold focus:outline-none transition-all
                   backdrop-blur-sm flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-gray-500'}>{selectedDisplay}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-white/10 rounded-xl shadow-2xl
                        backdrop-blur-xl max-h-64 overflow-hidden">
          <div className="p-2">
            <input
              type="text"
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm
                         placeholder-gray-500 focus:outline-none focus:border-forch-gold/50"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredTeams.map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => {
                  const cleanName = team.includes(' ') ? team.slice(team.indexOf(' ') + 1) : team;
                  onChange(cleanName);
                  setIsOpen(false);
                  setSearch('');
                }}
                className="w-full px-4 py-2 text-left text-white hover:bg-forch-gold/20 transition-colors
                           flex items-center gap-2"
              >
                <span>{team}</span>
              </button>
            ))}
            {filteredTeams.length === 0 && (
              <div className="px-4 py-3 text-gray-500 text-sm">No se encontraron equipos</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
