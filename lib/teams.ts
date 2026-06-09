// FORCH.i ORACLE — 48 Equipos del Mundial FIFA 2026
// Organizados por confederación con banderas

export interface Team {
  name: string;
  englishName: string; // API-Football uses English names
  code: string;
  flag: string;
  confederation: string;
  group: string;
}

export const WORLD_CUP_TEAMS: Team[] = [
  // ═══════════════ UEFA (Europa) ═══════════════
  { name: 'Alemania', englishName: 'Germany', code: 'GER', flag: '🇩🇪', confederation: 'UEFA', group: 'A' },
  { name: 'Francia', englishName: 'France', code: 'FRA', flag: '🇫🇷', confederation: 'UEFA', group: 'B' },
  { name: 'Inglaterra', englishName: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', group: 'C' },
  { name: 'España', englishName: 'Spain', code: 'ESP', flag: '🇪🇸', confederation: 'UEFA', group: 'D' },
  { name: 'Bélgica', englishName: 'Belgium', code: 'BEL', flag: '🇧🇪', confederation: 'UEFA', group: 'E' },
  { name: 'Países Bajos', englishName: 'Netherlands', code: 'NED', flag: '🇳🇱', confederation: 'UEFA', group: 'F' },
  { name: 'Portugal', englishName: 'Portugal', code: 'POR', flag: '🇵🇹', confederation: 'UEFA', group: 'G' },
  { name: 'Italia', englishName: 'Italy', code: 'ITA', flag: '🇮🇹', confederation: 'UEFA', group: 'H' },
  { name: 'Croacia', englishName: 'Croatia', code: 'CRO', flag: '🇭🇷', confederation: 'UEFA', group: 'I' },
  { name: 'Dinamarca', englishName: 'Denmark', code: 'DEN', flag: '🇩🇰', confederation: 'UEFA', group: 'J' },
  { name: 'Suiza', englishName: 'Switzerland', code: 'SUI', flag: '🇨🇭', confederation: 'UEFA', group: 'K' },
  { name: 'Austria', englishName: 'Austria', code: 'AUT', flag: '🇦🇹', confederation: 'UEFA', group: 'L' },
  { name: 'Escocia', englishName: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA', group: 'A' },
  { name: 'Serbia', englishName: 'Serbia', code: 'SRB', flag: '🇷🇸', confederation: 'UEFA', group: 'B' },
  { name: 'Ucrania', englishName: 'Ukraine', code: 'UKR', flag: '🇺🇦', confederation: 'UEFA', group: 'C' },
  { name: 'Turquía', englishName: 'Turkey', code: 'TUR', flag: '🇹🇷', confederation: 'UEFA', group: 'D' },
  { name: 'República Checa', englishName: 'Czech Republic', code: 'CZE', flag: '🇨🇿', confederation: 'UEFA', group: 'E' },
  { name: 'Hungría', englishName: 'Hungary', code: 'HUN', flag: '🇭🇺', confederation: 'UEFA', group: 'F' },
  { name: 'Bosnia y Herzegovina', englishName: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦', confederation: 'UEFA', group: 'B' },
  { name: 'Suecia', englishName: 'Sweden', code: 'SWE', flag: '🇸🇪', confederation: 'UEFA', group: 'F' },
  { name: 'Noruega', englishName: 'Norway', code: 'NOR', flag: '🇳🇴', confederation: 'UEFA', group: 'I' },

  // ═══════════════ CONMEBOL (Sudamérica) ═══════════════
  { name: 'Argentina', englishName: 'Argentina', code: 'ARG', flag: '🇦🇷', confederation: 'CONMEBOL', group: 'A' },
  { name: 'Brasil', englishName: 'Brazil', code: 'BRA', flag: '🇧🇷', confederation: 'CONMEBOL', group: 'B' },
  { name: 'Colombia', englishName: 'Colombia', code: 'COL', flag: '🇨🇴', confederation: 'CONMEBOL', group: 'C' },
  { name: 'Uruguay', englishName: 'Uruguay', code: 'URU', flag: '🇺🇾', confederation: 'CONMEBOL', group: 'D' },
  { name: 'Ecuador', englishName: 'Ecuador', code: 'ECU', flag: '🇪🇨', confederation: 'CONMEBOL', group: 'E' },
  { name: 'Paraguay', englishName: 'Paraguay', code: 'PAR', flag: '🇵🇾', confederation: 'CONMEBOL', group: 'F' },

  // ═══════════════ CONCACAF (Norte y Centro América) ═══════════════
  { name: 'México', englishName: 'Mexico', code: 'MEX', flag: '🇲🇽', confederation: 'CONCACAF', group: 'A' },
  { name: 'Estados Unidos', englishName: 'USA', code: 'USA', flag: '🇺🇸', confederation: 'CONCACAF', group: 'B' },
  { name: 'Canadá', englishName: 'Canada', code: 'CAN', flag: '🇨🇦', confederation: 'CONCACAF', group: 'C' },
  { name: 'Costa Rica', englishName: 'Costa Rica', code: 'CRC', flag: '🇨🇷', confederation: 'CONCACAF', group: 'D' },
  { name: 'Jamaica', englishName: 'Jamaica', code: 'JAM', flag: '🇯🇲', confederation: 'CONCACAF', group: 'E' },
  { name: 'Panamá', englishName: 'Panama', code: 'PAN', flag: '🇵🇦', confederation: 'CONCACAF', group: 'F' },
  { name: 'Haití', englishName: 'Haiti', code: 'HTI', flag: '🇭🇹', confederation: 'CONCACAF', group: 'C' },
  { name: 'Curazao', englishName: 'Curacao', code: 'CUW', flag: '🇨🇼', confederation: 'CONCACAF', group: 'E' },

  // ═══════════════ CAF (África) ═══════════════
  { name: 'Marruecos', englishName: 'Morocco', code: 'MAR', flag: '🇲🇦', confederation: 'CAF', group: 'A' },
  { name: 'Senegal', englishName: 'Senegal', code: 'SEN', flag: '🇸🇳', confederation: 'CAF', group: 'B' },
  { name: 'Túnez', englishName: 'Tunisia', code: 'TUN', flag: '🇹🇳', confederation: 'CAF', group: 'C' },
  { name: 'Camerún', englishName: 'Cameroon', code: 'CMR', flag: '🇨🇲', confederation: 'CAF', group: 'D' },
  { name: 'Ghana', englishName: 'Ghana', code: 'GHA', flag: '🇬🇭', confederation: 'CAF', group: 'E' },
  { name: 'Nigeria', englishName: 'Nigeria', code: 'NGA', flag: '🇳🇬', confederation: 'CAF', group: 'F' },
  { name: 'Argelia', englishName: 'Algeria', code: 'ALG', flag: '🇩🇿', confederation: 'CAF', group: 'G' },
  { name: 'Costa de Marfil', englishName: 'Ivory Coast', code: 'CIV', flag: '🇨🇮', confederation: 'CAF', group: 'H' },
  { name: 'Egipto', englishName: 'Egypt', code: 'EGY', flag: '🇪🇬', confederation: 'CAF', group: 'G' },
  { name: 'Sudáfrica', englishName: 'South Africa', code: 'RSA', flag: '🇿🇦', confederation: 'CAF', group: 'A' },
  { name: 'Cabo Verde', englishName: 'Cape Verde', code: 'CPV', flag: '🇨🇻', confederation: 'CAF', group: 'H' },
  { name: 'RD Congo', englishName: 'DR Congo', code: 'COD', flag: '🇨🇩', confederation: 'CAF', group: 'K' },

  // ═══════════════ AFC (Asia) ═══════════════
  { name: 'Japón', englishName: 'Japan', code: 'JPN', flag: '🇯🇵', confederation: 'AFC', group: 'A' },
  { name: 'Corea del Sur', englishName: 'South Korea', code: 'KOR', flag: '🇰🇷', confederation: 'AFC', group: 'B' },
  { name: 'Australia', englishName: 'Australia', code: 'AUS', flag: '🇦🇺', confederation: 'AFC', group: 'C' },
  { name: 'Arabia Saudita', englishName: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', confederation: 'AFC', group: 'D' },
  { name: 'Irán', englishName: 'Iran', code: 'IRN', flag: '🇮🇷', confederation: 'AFC', group: 'E' },
  { name: 'Qatar', englishName: 'Qatar', code: 'QAT', flag: '🇶🇦', confederation: 'AFC', group: 'F' },
  { name: 'Irak', englishName: 'Iraq', code: 'IRQ', flag: '🇮🇶', confederation: 'AFC', group: 'G' },
  { name: 'Uzbekistán', englishName: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', confederation: 'AFC', group: 'H' },
  { name: 'Jordania', englishName: 'Jordan', code: 'JOR', flag: '🇯🇴', confederation: 'AFC', group: 'J' },

  // ═══════════════ OFC (Oceanía) ═══════════════
  { name: 'Nueva Zelanda', englishName: 'New Zealand', code: 'NZL', flag: '🇳🇿', confederation: 'OFC', group: 'A' },
];

// Lookup: Spanish name → English API name (derived from team data, not hardcoded)
const englishNameMap = new Map<string, string>(
  WORLD_CUP_TEAMS.map((t) => [t.name.toLowerCase(), t.englishName])
);

/**
 * Convert a Spanish team name to the English name used by API-Football.
 * Falls back to the original name if not found.
 */
export function getTeamEnglishName(spanishName: string): string {
  return englishNameMap.get(spanishName.toLowerCase()) || spanishName;
}

/** Get all team names in Spanish (for dropdowns) */
export const TEAM_NAMES = WORLD_CUP_TEAMS.map((t) => `${t.flag} ${t.name}`).sort();

/** Función para obtener equipo por nombre */
export function getTeamByName(name: string): Team | undefined {
  return WORLD_CUP_TEAMS.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
}

/** Función para obtener equipos por grupo */
export function getTeamsByGroup(group: string): Team[] {
  return WORLD_CUP_TEAMS.filter((t) => t.group === group);
}
