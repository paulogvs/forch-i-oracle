// FORCH.i ORACLE — 48 Equipos del Mundial FIFA 2026
// Organizados por confederación con banderas

export interface Team {
  name: string;
  englishName: string;
  code: string;
  flag: string;
  confederation: string;
  group: string;
  starPlayers: string[]; // 2-3 key players
}

export const WORLD_CUP_TEAMS: Team[] = [
  // ═══════════════ GROUP A — México, Sudáfrica, Chequia, Italia ═══════════════
  { name: 'México', englishName: 'Mexico', code: 'MEX', flag: '🇲🇽', confederation: 'CONCACAF', group: 'A', starPlayers: ['Santiago Giménez', 'Edson Álvarez', 'Guillermo Ochoa'] },
  { name: 'Sudáfrica', englishName: 'South Africa', code: 'RSA', flag: '🇿🇦', confederation: 'CAF', group: 'A', starPlayers: ['Percy Tau', 'Themba Zwane', 'Lyle Foster'] },
  { name: 'Chequia', englishName: 'Czech Republic', code: 'CZE', flag: '🇨🇿', confederation: 'UEFA', group: 'A', starPlayers: ['Patrik Schick', 'Tomáš Souček', 'Vladimír Coufal'] },
  { name: 'Italia', englishName: 'Italy', code: 'ITA', flag: '🇮🇹', confederation: 'UEFA', group: 'A', starPlayers: ['Federico Chiesa', 'Nicolò Barella', 'Gianluigi Donnarumma'] },

  // ═══════════════ GROUP B — Canadá, Bosnia, Qatar, Suiza ═══════════════
  { name: 'Canadá', englishName: 'Canada', code: 'CAN', flag: '🇨🇦', confederation: 'CONCACAF', group: 'B', starPlayers: ['Alphonso Davies', 'Jonathan David', 'Cyle Larin'] },
  { name: 'Bosnia y Herzegovina', englishName: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦', confederation: 'UEFA', group: 'B', starPlayers: ['Edin Džeko', 'Miralem Pjanić', 'Rade Krunić'] },
  { name: 'Qatar', englishName: 'Qatar', code: 'QAT', flag: '🇶🇦', confederation: 'AFC', group: 'B', starPlayers: ['Akram Afif', 'Almoez Ali', 'Hassan Al-Haydos'] },
  { name: 'Suiza', englishName: 'Switzerland', code: 'SUI', flag: '🇨🇭', confederation: 'UEFA', group: 'B', starPlayers: ['Granit Xhaka', 'Manuel Akanji', 'Breel Embolo'] },

  // ═══════════════ GROUP C — Brasil, Marruecos, Haití, Escocia ═══════════════
  { name: 'Brasil', englishName: 'Brazil', code: 'BRA', flag: '🇧🇷', confederation: 'CONMEBOL', group: 'C', starPlayers: ['Vinícius Jr.', 'Rodrygo', 'Marquinhos'] },
  { name: 'Marruecos', englishName: 'Morocco', code: 'MAR', flag: '🇲🇦', confederation: 'CAF', group: 'C', starPlayers: ['Achraf Hakimi', 'Hakim Ziyech', 'Sofyan Amrabat'] },
  { name: 'Haití', englishName: 'Haiti', code: 'HTI', flag: '🇭🇹', confederation: 'CONCACAF', group: 'C', starPlayers: ['Duckens Nazon', 'Wilde-Donald Guerrier', 'Carlens Arcus'] },
  { name: 'Escocia', englishName: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA', group: 'C', starPlayers: ['Andrew Robertson', 'John McGinn', 'Che Adams'] },

  // ═══════════════ GROUP D — Estados Unidos, Paraguay, Australia, Turquía ═══════════════
  { name: 'Estados Unidos', englishName: 'USA', code: 'USA', flag: '🇺🇸', confederation: 'CONCACAF', group: 'D', starPlayers: ['Christian Pulisic', 'Tyler Adams', 'Weston McKennie'] },
  { name: 'Paraguay', englishName: 'Paraguay', code: 'PAR', flag: '🇵🇾', confederation: 'CONMEBOL', group: 'D', starPlayers: ['Miguel Almirón', 'Gustavo Gómez', 'Julio Enciso'] },
  { name: 'Australia', englishName: 'Australia', code: 'AUS', flag: '🇦🇺', confederation: 'AFC', group: 'D', starPlayers: ['Mathew Leckie', 'Riley McGree', 'Ajdin Hrustic'] },
  { name: 'Turquía', englishName: 'Turkey', code: 'TUR', flag: '🇹🇷', confederation: 'UEFA', group: 'D', starPlayers: ['Arda Güler', 'Hakan Çalhanoğlu', 'Kenan Yıldız'] },

  // ═══════════════ GROUP E — Alemania, Curazao, Costa de Marfil, Ecuador ═══════════════
  { name: 'Alemania', englishName: 'Germany', code: 'GER', flag: '🇩🇪', confederation: 'UEFA', group: 'E', starPlayers: ['Jamal Musiala', 'Florian Wirtz', 'Antonio Rüdiger'] },
  { name: 'Curazao', englishName: 'Curacao', code: 'CUW', flag: '🇨🇼', confederation: 'CONCACAF', group: 'E', starPlayers: ['Juninho Bacuna', 'Brandley Kuwas', 'Jarchinio Antonia'] },
  { name: 'Costa de Marfil', englishName: 'Ivory Coast', code: 'CIV', flag: '🇨🇮', confederation: 'CAF', group: 'E', starPlayers: ['Sébastien Haller', 'Franck Kessié', 'Wilfried Zaha'] },
  { name: 'Ecuador', englishName: 'Ecuador', code: 'ECU', flag: '🇪🇨', confederation: 'CONMEBOL', group: 'E', starPlayers: ['Moisés Caicedo', 'Kendry Páez', 'Piero Hincapié'] },

  // ═══════════════ GROUP F — Países Bajos, Japón, Suecia, Túnez ═══════════════
  { name: 'Países Bajos', englishName: 'Netherlands', code: 'NED', flag: '🇳🇱', confederation: 'UEFA', group: 'F', starPlayers: ['Cody Gakpo', 'Virgil van Dijk', 'Xavi Simons'] },
  { name: 'Japón', englishName: 'Japan', code: 'JPN', flag: '🇯🇵', confederation: 'AFC', group: 'F', starPlayers: ['Kaoru Mitoma', 'Takefusa Kubo', 'Wataru Endo'] },
  { name: 'Suecia', englishName: 'Sweden', code: 'SWE', flag: '🇸🇪', confederation: 'UEFA', group: 'F', starPlayers: ['Viktor Gyökeres', 'Alexander Isak', 'Dejan Kulusevski'] },
  { name: 'Túnez', englishName: 'Tunisia', code: 'TUN', flag: '🇹🇳', confederation: 'CAF', group: 'F', starPlayers: ['Wahbi Khazri', 'Ellyes Skhiri', 'Hannibal Mejbri'] },

  // ═══════════════ GROUP G — Bélgica, Egipto, Irán, Nueva Zelanda ═══════════════
  { name: 'Bélgica', englishName: 'Belgium', code: 'BEL', flag: '🇧🇪', confederation: 'UEFA', group: 'G', starPlayers: ['Jérémy Doku', 'Romelu Lukaku', 'Youri Tielemans'] },
  { name: 'Egipto', englishName: 'Egypt', code: 'EGY', flag: '🇪🇬', confederation: 'CAF', group: 'G', starPlayers: ['Mohamed Salah', 'Mostafa Mohamed', 'Trezeguet'] },
  { name: 'Irán', englishName: 'Iran', code: 'IRN', flag: '🇮🇷', confederation: 'AFC', group: 'G', starPlayers: ['Mehdi Taremi', 'Sardar Azmoun', 'Alireza Jahanbakhsh'] },
  { name: 'Nueva Zelanda', englishName: 'New Zealand', code: 'NZL', flag: '🇳🇿', confederation: 'OFC', group: 'G', starPlayers: ['Chris Wood', 'Liberato Cacace', 'Joe Bell'] },

  // ═══════════════ GROUP H — España, Arabia Saudita, Uruguay, Cabo Verde ═══════════════
  { name: 'España', englishName: 'Spain', code: 'ESP', flag: '🇪🇸', confederation: 'UEFA', group: 'H', starPlayers: ['Lamine Yamal', 'Pedri', 'Rodri'] },
  { name: 'Arabia Saudita', englishName: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', confederation: 'AFC', group: 'H', starPlayers: ['Salem Al-Dawsari', 'Saleh Al-Shehri', 'Mohammed Al-Owais'] },
  { name: 'Uruguay', englishName: 'Uruguay', code: 'URU', flag: '🇺🇾', confederation: 'CONMEBOL', group: 'H', starPlayers: ['Federico Valverde', 'Darwin Núñez', 'Ronald Araújo'] },
  { name: 'Cabo Verde', englishName: 'Cape Verde', code: 'CPV', flag: '🇨🇻', confederation: 'CAF', group: 'H', starPlayers: ['Bebé', 'Garry Rodrigues', 'Ryan Mendes'] },

  // ═══════════════ GROUP I — Francia, Senegal, Irak, Noruega ═══════════════
  { name: 'Francia', englishName: 'France', code: 'FRA', flag: '🇫🇷', confederation: 'UEFA', group: 'I', starPlayers: ['Kylian Mbappé', 'Aurélien Tchouaméni', 'William Saliba'] },
  { name: 'Senegal', englishName: 'Senegal', code: 'SEN', flag: '🇸🇳', confederation: 'CAF', group: 'I', starPlayers: ['Sadio Mané', 'Nicolas Jackson', 'Pape Matar Sarr'] },
  { name: 'Irak', englishName: 'Iraq', code: 'IRQ', flag: '🇮🇶', confederation: 'AFC', group: 'I', starPlayers: ['Aymen Hussein', 'Mohammed Amin', 'Ali Adnan'] },
  { name: 'Noruega', englishName: 'Norway', code: 'NOR', flag: '🇳🇴', confederation: 'UEFA', group: 'I', starPlayers: ['Erling Haaland', 'Martin Ødegaard', 'Alexander Sørloth'] },

  // ═══════════════ GROUP J — Argentina, Argelia, Austria, Jordania ═══════════════
  { name: 'Argentina', englishName: 'Argentina', code: 'ARG', flag: '🇦🇷', confederation: 'CONMEBOL', group: 'J', starPlayers: ['Lionel Messi', 'Julián Álvarez', 'Enzo Fernández'] },
  { name: 'Argelia', englishName: 'Algeria', code: 'ALG', flag: '🇩🇿', confederation: 'CAF', group: 'J', starPlayers: ['Riyad Mahrez', 'Youcef Atal', 'Amine Gouiri'] },
  { name: 'Austria', englishName: 'Austria', code: 'AUT', flag: '🇦🇹', confederation: 'UEFA', group: 'J', starPlayers: ['David Alaba', 'Marcel Sabitzer', 'Christoph Baumgartner'] },
  { name: 'Jordania', englishName: 'Jordan', code: 'JOR', flag: '🇯🇴', confederation: 'AFC', group: 'J', starPlayers: ['Musa Al-Taamari', 'Yazan Al-Naimat', 'Ali Olwan'] },

  // ═══════════════ GROUP K — Portugal, RD Congo, Uzbekistán, Colombia ═══════════════
  { name: 'Portugal', englishName: 'Portugal', code: 'POR', flag: '🇵🇹', confederation: 'UEFA', group: 'K', starPlayers: ['Cristiano Ronaldo', 'Bruno Fernandes', 'Rúben Dias'] },
  { name: 'RD Congo', englishName: 'DR Congo', code: 'COD', flag: '🇨🇩', confederation: 'CAF', group: 'K', starPlayers: ['Cédric Bakambu', 'Yoane Wissa', 'Arthur Masuaku'] },
  { name: 'Uzbekistán', englishName: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', confederation: 'AFC', group: 'K', starPlayers: ['Sardor Rashidov', 'Jaloliddin Masharipov', 'Odiljon Hamrobekov'] },
  { name: 'Colombia', englishName: 'Colombia', code: 'COL', flag: '🇨🇴', confederation: 'CONMEBOL', group: 'K', starPlayers: ['James Rodríguez', 'Luis Díaz', 'Jhon Arias'] },

  // ═══════════════ GROUP L — Inglaterra, Croacia, Ghana, Panamá ═══════════════
  { name: 'Inglaterra', englishName: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', group: 'L', starPlayers: ['Jude Bellingham', 'Harry Kane', 'Bukayo Saka'] },
  { name: 'Croacia', englishName: 'Croatia', code: 'CRO', flag: '🇭🇷', confederation: 'UEFA', group: 'L', starPlayers: ['Luka Modrić', 'Joško Gvardiol', 'Marcelo Brozović'] },
  { name: 'Ghana', englishName: 'Ghana', code: 'GHA', flag: '🇬🇭', confederation: 'CAF', group: 'L', starPlayers: ['Mohammed Kudus', 'Thomas Partey', 'Inaki Williams'] },
  { name: 'Panamá', englishName: 'Panama', code: 'PAN', flag: '🇵🇦', confederation: 'CONCACAF', group: 'L', starPlayers: ['José Fajardo', 'César Blackman', 'Aníbal Godoy'] },
];

// Lookup: Spanish name → English API name (derived from team data, not hardcoded)
const englishNameMap = new Map<string, string>(
  WORLD_CUP_TEAMS.map((t) => [t.name.toLowerCase(), t.englishName])
);

const starPlayerMap = new Map<string, string[]>(
  WORLD_CUP_TEAMS.map((t) => [t.name.toLowerCase(), t.starPlayers])
);

/**
 * Convert a Spanish team name to the English name used by API-Football.
 * Falls back to the original name if not found.
 */
export function getTeamEnglishName(spanishName: string): string {
  return englishNameMap.get(spanishName.toLowerCase()) || spanishName;
}

/** Get star players for a team */
export function getTeamStarPlayers(teamName: string): string[] {
  return starPlayerMap.get(teamName.toLowerCase()) || [];
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
