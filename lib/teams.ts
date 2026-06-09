// FORCH.i ORACLE — 48 Equipos del Mundial FIFA 2026
// Organizados por confederación con banderas

export interface Team {
  name: string;
  code: string;
  flag: string;
  confederation: string;
  group: string;
}

export const WORLD_CUP_TEAMS: Team[] = [
  // ═══════════════ UEFA (Europa) ═══════════════
  { name: 'Alemania', code: 'GER', flag: '🇩🇪', confederation: 'UEFA', group: 'A' },
  { name: 'Francia', code: 'FRA', flag: '🇫🇷', confederation: 'UEFA', group: 'B' },
  { name: 'Inglaterra', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', group: 'C' },
  { name: 'España', code: 'ESP', flag: '🇪🇸', confederation: 'UEFA', group: 'D' },
  { name: 'Bélgica', code: 'BEL', flag: '🇧🇪', confederation: 'UEFA', group: 'E' },
  { name: 'Países Bajos', code: 'NED', flag: '🇳🇱', confederation: 'UEFA', group: 'F' },
  { name: 'Portugal', code: 'POR', flag: '🇵🇹', confederation: 'UEFA', group: 'G' },
  { name: 'Italia', code: 'ITA', flag: '🇮🇹', confederation: 'UEFA', group: 'H' },
  { name: 'Croacia', code: 'CRO', flag: '🇭🇷', confederation: 'UEFA', group: 'I' },
  { name: 'Dinamarca', code: 'DEN', flag: '🇩🇰', confederation: 'UEFA', group: 'J' },
  { name: 'Suiza', code: 'SUI', flag: '🇨🇭', confederation: 'UEFA', group: 'K' },
  { name: 'Austria', code: 'AUT', flag: '🇦🇹', confederation: 'UEFA', group: 'L' },
  { name: 'Escocia', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA', group: 'A' },
  { name: 'Serbia', code: 'SRB', flag: '🇷🇸', confederation: 'UEFA', group: 'B' },
  { name: 'Ucrania', code: 'UKR', flag: '🇺🇦', confederation: 'UEFA', group: 'C' },
  { name: 'Turquía', code: 'TUR', flag: '🇹🇷', confederation: 'UEFA', group: 'D' },
  { name: 'República Checa', code: 'CZE', flag: '🇨🇿', confederation: 'UEFA', group: 'E' },
  { name: 'Hungría', code: 'HUN', flag: '🇭🇺', confederation: 'UEFA', group: 'F' },

  // ═══════════════ CONMEBOL (Sudamérica) ═══════════════
  { name: 'Argentina', code: 'ARG', flag: '🇦🇷', confederation: 'CONMEBOL', group: 'A' },
  { name: 'Brasil', code: 'BRA', flag: '🇧🇷', confederation: 'CONMEBOL', group: 'B' },
  { name: 'Colombia', code: 'COL', flag: '🇨🇴', confederation: 'CONMEBOL', group: 'C' },
  { name: 'Uruguay', code: 'URU', flag: '🇺🇾', confederation: 'CONMEBOL', group: 'D' },
  { name: 'Ecuador', code: 'ECU', flag: '🇪🇨', confederation: 'CONMEBOL', group: 'E' },
  { name: 'Paraguay', code: 'PAR', flag: '🇵🇾', confederation: 'CONMEBOL', group: 'F' },

  // ═══════════════ CONCACAF (Norte y Centro América) ═══════════════
  { name: 'México', code: 'MEX', flag: '🇲🇽', confederation: 'CONCACAF', group: 'A' },
  { name: 'Estados Unidos', code: 'USA', flag: '🇺🇸', confederation: 'CONCACAF', group: 'B' },
  { name: 'Canadá', code: 'CAN', flag: '🇨🇦', confederation: 'CONCACAF', group: 'C' },
  { name: 'Costa Rica', code: 'CRC', flag: '🇨🇷', confederation: 'CONCACAF', group: 'D' },
  { name: 'Jamaica', code: 'JAM', flag: '🇯🇲', confederation: 'CONCACAF', group: 'E' },
  { name: 'Panamá', code: 'PAN', flag: '🇵🇦', confederation: 'CONCACAF', group: 'F' },

  // ═══════════════ CAF (África) ═══════════════
  { name: 'Marruecos', code: 'MAR', flag: '🇲🇦', confederation: 'CAF', group: 'A' },
  { name: 'Senegal', code: 'SEN', flag: '🇸🇳', confederation: 'CAF', group: 'B' },
  { name: 'Túnez', code: 'TUN', flag: '🇹🇳', confederation: 'CAF', group: 'C' },
  { name: 'Camerún', code: 'CMR', flag: '🇨🇲', confederation: 'CAF', group: 'D' },
  { name: 'Ghana', code: 'GHA', flag: '🇬🇭', confederation: 'CAF', group: 'E' },
  { name: 'Nigeria', code: 'NGA', flag: '🇳🇬', confederation: 'CAF', group: 'F' },
  { name: 'Argelia', code: 'ALG', flag: '🇩🇿', confederation: 'CAF', group: 'G' },
  { name: 'Costa de Marfil', code: 'CIV', flag: '🇨🇮', confederation: 'CAF', group: 'H' },

  // ═══════════════ AFC (Asia) ═══════════════
  { name: 'Japón', code: 'JPN', flag: '🇯🇵', confederation: 'AFC', group: 'A' },
  { name: 'Corea del Sur', code: 'KOR', flag: '🇰🇷', confederation: 'AFC', group: 'B' },
  { name: 'Australia', code: 'AUS', flag: '🇦🇺', confederation: 'AFC', group: 'C' },
  { name: 'Arabia Saudita', code: 'KSA', flag: '🇸🇦', confederation: 'AFC', group: 'D' },
  { name: 'Irán', code: 'IRN', flag: '🇮🇷', confederation: 'AFC', group: 'E' },
  { name: 'Qatar', code: 'QAT', flag: '🇶🇦', confederation: 'AFC', group: 'F' },
  { name: 'Irak', code: 'IRQ', flag: '🇮🇶', confederation: 'AFC', group: 'G' },
  { name: 'Uzbekistán', code: 'UZB', flag: '🇺🇿', confederation: 'AFC', group: 'H' },

  // ═══════════════ OFC (Oceanía) ═══════════════
  { name: 'Nueva Zelanda', code: 'NZL', flag: '🇳🇿', confederation: 'OFC', group: 'A' },
];

// Función para obtener equipo por nombre
export function getTeamByName(name: string): Team | undefined {
  return WORLD_CUP_TEAMS.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
}

// Función para obtener equipos por grupo
export function getTeamsByGroup(group: string): Team[] {
  return WORLD_CUP_TEAMS.filter((t) => t.group === group);
}

// Lista de nombres para los dropdowns
export const TEAM_NAMES = WORLD_CUP_TEAMS.map((t) => `${t.flag} ${t.name}`).sort();
