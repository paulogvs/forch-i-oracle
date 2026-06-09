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
  // ═══════════════ UEFA (Europa) ═══════════════
  { name: 'Alemania', englishName: 'Germany', code: 'GER', flag: '🇩🇪', confederation: 'UEFA', group: 'A', starPlayers: ['Jamal Musiala', 'Florian Wirtz', 'Antonio Rüdiger'] },
  { name: 'Francia', englishName: 'France', code: 'FRA', flag: '🇫🇷', confederation: 'UEFA', group: 'B', starPlayers: ['Kylian Mbappé', 'Aurélien Tchouaméni', 'William Saliba'] },
  { name: 'Inglaterra', englishName: 'England', code: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', confederation: 'UEFA', group: 'C', starPlayers: ['Jude Bellingham', 'Harry Kane', 'Bukayo Saka'] },
  { name: 'España', englishName: 'Spain', code: 'ESP', flag: '🇪🇸', confederation: 'UEFA', group: 'D', starPlayers: ['Lamine Yamal', 'Pedri', 'Rodri'] },
  { name: 'Bélgica', englishName: 'Belgium', code: 'BEL', flag: '🇧🇪', confederation: 'UEFA', group: 'E', starPlayers: ['Jérémy Doku', 'Romelu Lukaku', 'Youri Tielemans'] },
  { name: 'Países Bajos', englishName: 'Netherlands', code: 'NED', flag: '🇳🇱', confederation: 'UEFA', group: 'F', starPlayers: ['Cody Gakpo', 'Virgil van Dijk', 'Xavi Simons'] },
  { name: 'Portugal', englishName: 'Portugal', code: 'POR', flag: '🇵🇹', confederation: 'UEFA', group: 'G', starPlayers: ['Cristiano Ronaldo', 'Bruno Fernandes', 'Rúben Dias'] },
  { name: 'Italia', englishName: 'Italy', code: 'ITA', flag: '🇮🇹', confederation: 'UEFA', group: 'H', starPlayers: ['Nicolò Barella', 'Federico Chiesa', 'Alessandro Bastoni'] },
  { name: 'Croacia', englishName: 'Croatia', code: 'CRO', flag: '🇭🇷', confederation: 'UEFA', group: 'I', starPlayers: ['Luka Modrić', 'Joško Gvardiol', 'Marcelo Brozović'] },
  { name: 'Dinamarca', englishName: 'Denmark', code: 'DEN', flag: '🇩🇰', confederation: 'UEFA', group: 'J', starPlayers: ['Rasmus Højlund', 'Christian Eriksen', 'Pierre-Emile Højbjerg'] },
  { name: 'Suiza', englishName: 'Switzerland', code: 'SUI', flag: '🇨🇭', confederation: 'UEFA', group: 'K', starPlayers: ['Granit Xhaka', 'Manuel Akanji', 'Breel Embolo'] },
  { name: 'Austria', englishName: 'Austria', code: 'AUT', flag: '🇦🇹', confederation: 'UEFA', group: 'L', starPlayers: ['David Alaba', 'Marcel Sabitzer', 'Christoph Baumgartner'] },
  { name: 'Escocia', englishName: 'Scotland', code: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', confederation: 'UEFA', group: 'A', starPlayers: ['Andrew Robertson', 'John McGinn', 'Che Adams'] },
  { name: 'Serbia', englishName: 'Serbia', code: 'SRB', flag: '🇷🇸', confederation: 'UEFA', group: 'B', starPlayers: ['Dušan Vlahović', 'Sergej Milinković-Savić', 'Aleksandar Mitrović'] },
  { name: 'Ucrania', englishName: 'Ukraine', code: 'UKR', flag: '🇺🇦', confederation: 'UEFA', group: 'C', starPlayers: ['Mykhailo Mudryk', 'Oleksandr Zinchenko', 'Artem Dovbyk'] },
  { name: 'Turquía', englishName: 'Turkey', code: 'TUR', flag: '🇹🇷', confederation: 'UEFA', group: 'D', starPlayers: ['Arda Güler', 'Hakan Çalhanoğlu', 'Kenan Yıldız'] },
  { name: 'República Checa', englishName: 'Czech Republic', code: 'CZE', flag: '🇨🇿', confederation: 'UEFA', group: 'E', starPlayers: ['Patrik Schick', 'Tomáš Souček', 'Vladimír Coufal'] },
  { name: 'Hungría', englishName: 'Hungary', code: 'HUN', flag: '🇭🇺', confederation: 'UEFA', group: 'F', starPlayers: ['Dominik Szoboszlai', 'Willi Orbán', 'Roland Sallai'] },
  { name: 'Bosnia y Herzegovina', englishName: 'Bosnia and Herzegovina', code: 'BIH', flag: '🇧🇦', confederation: 'UEFA', group: 'B', starPlayers: ['Edin Džeko', 'Miralem Pjanić', 'Rade Krunić'] },
  { name: 'Suecia', englishName: 'Sweden', code: 'SWE', flag: '🇸🇪', confederation: 'UEFA', group: 'F', starPlayers: ['Viktor Gyökeres', 'Alexander Isak', 'Dejan Kulusevski'] },
  { name: 'Noruega', englishName: 'Norway', code: 'NOR', flag: '🇳🇴', confederation: 'UEFA', group: 'I', starPlayers: ['Erling Haaland', 'Martin Ødegaard', 'Alexander Sørloth'] },

  // ═══════════════ CONMEBOL (Sudamérica) ═══════════════
  { name: 'Argentina', englishName: 'Argentina', code: 'ARG', flag: '🇦🇷', confederation: 'CONMEBOL', group: 'A', starPlayers: ['Lionel Messi', 'Julián Álvarez', 'Enzo Fernández'] },
  { name: 'Brasil', englishName: 'Brazil', code: 'BRA', flag: '🇧🇷', confederation: 'CONMEBOL', group: 'B', starPlayers: ['Vinícius Jr.', 'Rodrygo', 'Marquinhos'] },
  { name: 'Colombia', englishName: 'Colombia', code: 'COL', flag: '🇨🇴', confederation: 'CONMEBOL', group: 'C', starPlayers: ['James Rodríguez', 'Luis Díaz', 'Jhon Arias'] },
  { name: 'Uruguay', englishName: 'Uruguay', code: 'URU', flag: '🇺🇾', confederation: 'CONMEBOL', group: 'D', starPlayers: ['Federico Valverde', 'Darwin Núñez', 'Ronald Araújo'] },
  { name: 'Ecuador', englishName: 'Ecuador', code: 'ECU', flag: '🇪🇨', confederation: 'CONMEBOL', group: 'E', starPlayers: ['Moisés Caicedo', 'Kendry Páez', 'Piero Hincapié'] },
  { name: 'Paraguay', englishName: 'Paraguay', code: 'PAR', flag: '🇵🇾', confederation: 'CONMEBOL', group: 'F', starPlayers: ['Miguel Almirón', 'Gustavo Gómez', 'Julio Enciso'] },

  // ═══════════════ CONCACAF (Norte y Centro América) ═══════════════
  { name: 'México', englishName: 'Mexico', code: 'MEX', flag: '🇲🇽', confederation: 'CONCACAF', group: 'A', starPlayers: ['Santiago Giménez', 'Edson Álvarez', 'Guillermo Ochoa'] },
  { name: 'Estados Unidos', englishName: 'USA', code: 'USA', flag: '🇺🇸', confederation: 'CONCACAF', group: 'B', starPlayers: ['Christian Pulisic', 'Tyler Adams', 'Weston McKennie'] },
  { name: 'Canadá', englishName: 'Canada', code: 'CAN', flag: '🇨🇦', confederation: 'CONCACAF', group: 'C', starPlayers: ['Alphonso Davies', 'Jonathan David', 'Cyle Larin'] },
  { name: 'Costa Rica', englishName: 'Costa Rica', code: 'CRC', flag: '🇨🇷', confederation: 'CONCACAF', group: 'D', starPlayers: ['Keysher Fuller', 'Celso Borges', 'Anthony Contreras'] },
  { name: 'Jamaica', englishName: 'Jamaica', code: 'JAM', flag: '🇯🇲', confederation: 'CONCACAF', group: 'E', starPlayers: ['Michail Antonio', 'Bobby Decordova-Reid', 'Ethan Pinnock'] },
  { name: 'Panamá', englishName: 'Panama', code: 'PAN', flag: '🇵🇦', confederation: 'CONCACAF', group: 'F', starPlayers: ['José Fajardo', 'César Blackman', 'Aníbal Godoy'] },
  { name: 'Haití', englishName: 'Haiti', code: 'HTI', flag: '🇭🇹', confederation: 'CONCACAF', group: 'C', starPlayers: ['Duckens Nazon', 'Wilde-Donald Guerrier', 'Carlens Arcus'] },
  { name: 'Curazao', englishName: 'Curacao', code: 'CUW', flag: '🇨🇼', confederation: 'CONCACAF', group: 'E', starPlayers: ['Juninho Bacuna', 'Brandley Kuwas', 'Jarchinio Antonia'] },

  // ═══════════════ CAF (África) ═══════════════
  { name: 'Marruecos', englishName: 'Morocco', code: 'MAR', flag: '🇲🇦', confederation: 'CAF', group: 'A', starPlayers: ['Achraf Hakimi', 'Hakim Ziyech', 'Sofyan Amrabat'] },
  { name: 'Senegal', englishName: 'Senegal', code: 'SEN', flag: '🇸🇳', confederation: 'CAF', group: 'B', starPlayers: ['Sadio Mané', 'Nicolas Jackson', 'Pape Matar Sarr'] },
  { name: 'Túnez', englishName: 'Tunisia', code: 'TUN', flag: '🇹🇳', confederation: 'CAF', group: 'C', starPlayers: ['Wahbi Khazri', 'Ellyes Skhiri', 'Hannibal Mejbri'] },
  { name: 'Camerún', englishName: 'Cameroon', code: 'CMR', flag: '🇨🇲', confederation: 'CAF', group: 'D', starPlayers: ['Bryan Mbeumo', 'Vincent Aboubakar', 'André-Frank Zambo Anguissa'] },
  { name: 'Ghana', englishName: 'Ghana', code: 'GHA', flag: '🇬🇭', confederation: 'CAF', group: 'E', starPlayers: ['Mohammed Kudus', 'Thomas Partey', 'Inaki Williams'] },
  { name: 'Nigeria', englishName: 'Nigeria', code: 'NGA', flag: '🇳🇬', confederation: 'CAF', group: 'F', starPlayers: ['Victor Osimhen', 'Ademola Lookman', 'Alex Iwobi'] },
  { name: 'Argelia', englishName: 'Algeria', code: 'ALG', flag: '🇩🇿', confederation: 'CAF', group: 'G', starPlayers: ['Riyad Mahrez', 'Youcef Atal', 'Amine Gouiri'] },
  { name: 'Costa de Marfil', englishName: 'Ivory Coast', code: 'CIV', flag: '🇨🇮', confederation: 'CAF', group: 'H', starPlayers: ['Sébastien Haller', 'Franck Kessié', 'Wilfried Zaha'] },
  { name: 'Egipto', englishName: 'Egypt', code: 'EGY', flag: '🇪🇬', confederation: 'CAF', group: 'G', starPlayers: ['Mohamed Salah', 'Mostafa Mohamed', 'Trezeguet'] },
  { name: 'Sudáfrica', englishName: 'South Africa', code: 'RSA', flag: '🇿🇦', confederation: 'CAF', group: 'A', starPlayers: ['Percy Tau', 'Themba Zwane', 'Lyle Foster'] },
  { name: 'Cabo Verde', englishName: 'Cape Verde', code: 'CPV', flag: '🇨🇻', confederation: 'CAF', group: 'H', starPlayers: ['Bebé', 'Garry Rodrigues', 'Ryan Mendes'] },
  { name: 'RD Congo', englishName: 'DR Congo', code: 'COD', flag: '🇨🇩', confederation: 'CAF', group: 'K', starPlayers: ['Cédric Bakambu', 'Yoane Wissa', 'Arthur Masuaku'] },

  // ═══════════════ AFC (Asia) ═══════════════
  { name: 'Japón', englishName: 'Japan', code: 'JPN', flag: '🇯🇵', confederation: 'AFC', group: 'A', starPlayers: ['Kaoru Mitoma', 'Takefusa Kubo', 'Wataru Endo'] },
  { name: 'Corea del Sur', englishName: 'South Korea', code: 'KOR', flag: '🇰🇷', confederation: 'AFC', group: 'B', starPlayers: ['Son Heung-min', 'Hwang Hee-chan', 'Lee Kang-in'] },
  { name: 'Australia', englishName: 'Australia', code: 'AUS', flag: '🇦🇺', confederation: 'AFC', group: 'C', starPlayers: ['Mathew Leckie', 'Riley McGree', 'Ajdin Hrustic'] },
  { name: 'Arabia Saudita', englishName: 'Saudi Arabia', code: 'KSA', flag: '🇸🇦', confederation: 'AFC', group: 'D', starPlayers: ['Salem Al-Dawsari', 'Saleh Al-Shehri', 'Mohammed Al-Owais'] },
  { name: 'Irán', englishName: 'Iran', code: 'IRN', flag: '🇮🇷', confederation: 'AFC', group: 'E', starPlayers: ['Mehdi Taremi', 'Sardar Azmoun', 'Alireza Jahanbakhsh'] },
  { name: 'Qatar', englishName: 'Qatar', code: 'QAT', flag: '🇶🇦', confederation: 'AFC', group: 'F', starPlayers: ['Akram Afif', 'Almoez Ali', 'Hassan Al-Haydos'] },
  { name: 'Irak', englishName: 'Iraq', code: 'IRQ', flag: '🇮🇶', confederation: 'AFC', group: 'G', starPlayers: ['Aymen Hussein', 'Mohammed Amin', 'Sardar Azmoun'] },
  { name: 'Uzbekistán', englishName: 'Uzbekistan', code: 'UZB', flag: '🇺🇿', confederation: 'AFC', group: 'H', starPlayers: ['Sardor Rashidov', 'Jaloliddin Masharipov', 'Odiljon Hamrobekov'] },
  { name: 'Jordania', englishName: 'Jordan', code: 'JOR', flag: '🇯🇴', confederation: 'AFC', group: 'J', starPlayers: ['Musa Al-Taamari', 'Yazan Al-Naimat', 'Ali Olwan'] },

  // ═══════════════ OFC (Oceanía) ═══════════════
  { name: 'Nueva Zelanda', englishName: 'New Zealand', code: 'NZL', flag: '🇳🇿', confederation: 'OFC', group: 'A', starPlayers: ['Chris Wood', 'Liberato Cacace', 'Joe Bell'] },
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
