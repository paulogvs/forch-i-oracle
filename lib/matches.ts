// FORCH.i ORACLE — FIFA World Cup 2026 Official Schedule
// 48 teams in 12 groups of 4 → 72 group stage matches + 56 knockout matches
import { getTeamByName } from './teams';

export interface Match {
  id: string;
  group: string;
  matchday: number;
  date: string; // ISO date
  time: string; // UTC time
  homeTeam: string;
  awayTeam: string;
  homeCode: string;
  awayCode: string;
  venue: string;
  city: string;
  round: string; // 'group' | 'round-32' | 'round-16' | 'quarter' | 'semi' | 'third' | 'final'
  isTBD?: boolean; // true when a team slot is not yet determined
}

// ═══════════════════════════════════════════════════════════════
// GROUP A — Mexico, South Africa, Chequia, TBD
// ═══════════════════════════════════════════════════════════════
const GROUP_A: Match[] = [
  // Matchday 1
  { id: 'A1', group: 'A', matchday: 1, date: '2026-06-11', time: '02:00', homeTeam: 'México', awayTeam: 'Sudáfrica', homeCode: 'MEX', awayCode: 'RSA', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  // Matchday 2
  { id: 'A2', group: 'A', matchday: 2, date: '2026-06-18', time: '17:00', homeTeam: 'Chequia', awayTeam: 'Sudáfrica', homeCode: 'CZE', awayCode: 'RSA', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 3 (TBD based on standings)
  { id: 'A5', group: 'A', matchday: 3, date: '2026-06-24', time: '02:00', homeTeam: 'México', awayTeam: 'Chequia', homeCode: 'MEX', awayCode: 'CZE', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  { id: 'A6', group: 'A', matchday: 3, date: '2026-06-24', time: '02:00', homeTeam: 'Sudáfrica', awayTeam: 'TBD-A4', homeCode: 'RSA', awayCode: 'TBD', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group', isTBD: true },
];

// ═══════════════════════════════════════════════════════════════
// GROUP B — Canada, Bosnia, Qatar, Switzerland
// ═══════════════════════════════════════════════════════════════
const GROUP_B: Match[] = [
  // Matchday 1
  { id: 'B1', group: 'B', matchday: 1, date: '2026-06-12', time: '17:00', homeTeam: 'Canadá', awayTeam: 'Bosnia y Herzegovina', homeCode: 'CAN', awayCode: 'BIH', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  { id: 'B2', group: 'B', matchday: 1, date: '2026-06-13', time: '17:00', homeTeam: 'Qatar', awayTeam: 'Suiza', homeCode: 'QAT', awayCode: 'SUI', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  // Matchday 2
  { id: 'B3', group: 'B', matchday: 2, date: '2026-06-18', time: '20:00', homeTeam: 'Suiza', awayTeam: 'Bosnia y Herzegovina', homeCode: 'SUI', awayCode: 'BIH', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  { id: 'B4', group: 'B', matchday: 2, date: '2026-06-18', time: '23:00', homeTeam: 'Canadá', awayTeam: 'Qatar', homeCode: 'CAN', awayCode: 'QAT', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 3
  { id: 'B5', group: 'B', matchday: 3, date: '2026-06-24', time: '02:00', homeTeam: 'Suiza', awayTeam: 'Canadá', homeCode: 'SUI', awayCode: 'CAN', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'B6', group: 'B', matchday: 3, date: '2026-06-24', time: '02:00', homeTeam: 'Bosnia y Herzegovina', awayTeam: 'Qatar', homeCode: 'BIH', awayCode: 'QAT', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP C — Brazil, Morocco, Haiti, Scotland
// ═══════════════════════════════════════════════════════════════
const GROUP_C: Match[] = [
  // Matchday 1
  { id: 'C1', group: 'C', matchday: 1, date: '2026-06-13', time: '20:00', homeTeam: 'Brasil', awayTeam: 'Marruecos', homeCode: 'BRA', awayCode: 'MAR', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'C2', group: 'C', matchday: 1, date: '2026-06-13', time: '23:00', homeTeam: 'Haití', awayTeam: 'Escocia', homeCode: 'HTI', awayCode: 'SCO', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  // Matchday 2
  { id: 'C3', group: 'C', matchday: 2, date: '2026-06-19', time: '17:00', homeTeam: 'Escocia', awayTeam: 'Marruecos', homeCode: 'SCO', awayCode: 'MAR', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'C4', group: 'C', matchday: 2, date: '2026-06-19', time: '20:00', homeTeam: 'Brasil', awayTeam: 'Haití', homeCode: 'BRA', awayCode: 'HTI', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  // Matchday 3
  { id: 'C5', group: 'C', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Brasil', awayTeam: 'Escocia', homeCode: 'BRA', awayCode: 'SCO', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'C6', group: 'C', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Marruecos', awayTeam: 'Haití', homeCode: 'MAR', awayCode: 'HTI', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP D — USA, Paraguay, Australia, Turkey
// ═══════════════════════════════════════════════════════════════
const GROUP_D: Match[] = [
  // Matchday 1
  { id: 'D1', group: 'D', matchday: 1, date: '2026-06-12', time: '20:00', homeTeam: 'Estados Unidos', awayTeam: 'Paraguay', homeCode: 'USA', awayCode: 'PAR', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'D2', group: 'D', matchday: 1, date: '2026-06-14', time: '17:00', homeTeam: 'Australia', awayTeam: 'Turquía', homeCode: 'AUS', awayCode: 'TUR', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  // Matchday 2
  { id: 'D3', group: 'D', matchday: 2, date: '2026-06-19', time: '23:00', homeTeam: 'Turquía', awayTeam: 'Paraguay', homeCode: 'TUR', awayCode: 'PAR', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'D4', group: 'D', matchday: 2, date: '2026-06-20', time: '20:00', homeTeam: 'Estados Unidos', awayTeam: 'Australia', homeCode: 'USA', awayCode: 'AUS', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  // Matchday 3
  { id: 'D5', group: 'D', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Estados Unidos', awayTeam: 'Turquía', homeCode: 'USA', awayCode: 'TUR', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
  { id: 'D6', group: 'D', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Paraguay', awayTeam: 'Australia', homeCode: 'PAR', awayCode: 'AUS', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP E — Germany, Curacao, Costa de Marfil, Ecuador
// ═══════════════════════════════════════════════════════════════
const GROUP_E: Match[] = [
  // Matchday 1
  { id: 'E1', group: 'E', matchday: 1, date: '2026-06-14', time: '20:00', homeTeam: 'Alemania', awayTeam: 'Curazao', homeCode: 'GER', awayCode: 'CUW', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'E2', group: 'E', matchday: 1, date: '2026-06-14', time: '23:00', homeTeam: 'Costa de Marfil', awayTeam: 'Ecuador', homeCode: 'CIV', awayCode: 'ECU', venue: 'Levi\'s Stadium', city: 'San Francisco', round: 'group' },
  // Matchday 2
  { id: 'E3', group: 'E', matchday: 2, date: '2026-06-20', time: '20:00', homeTeam: 'Alemania', awayTeam: 'Costa de Marfil', homeCode: 'GER', awayCode: 'CIV', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'E4', group: 'E', matchday: 2, date: '2026-06-20', time: '23:00', homeTeam: 'Ecuador', awayTeam: 'Curazao', homeCode: 'ECU', awayCode: 'CUW', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 3
  { id: 'E5', group: 'E', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Ecuador', awayTeam: 'Alemania', homeCode: 'ECU', awayCode: 'GER', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  { id: 'E6', group: 'E', matchday: 3, date: '2026-06-25', time: '02:00', homeTeam: 'Curazao', awayTeam: 'Costa de Marfil', homeCode: 'CUW', awayCode: 'CIV', venue: 'BMO Field', city: 'Toronto', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP F — Netherlands, Japan, Sweden, Tunisia
// ═══════════════════════════════════════════════════════════════
const GROUP_F: Match[] = [
  // Matchday 1
  { id: 'F1', group: 'F', matchday: 1, date: '2026-06-14', time: '23:00', homeTeam: 'Países Bajos', awayTeam: 'Japón', homeCode: 'NED', awayCode: 'JPN', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'F2', group: 'F', matchday: 1, date: '2026-06-15', time: '20:00', homeTeam: 'Suecia', awayTeam: 'Túnez', homeCode: 'SWE', awayCode: 'TUN', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  // Matchday 2
  { id: 'F3', group: 'F', matchday: 2, date: '2026-06-20', time: '20:00', homeTeam: 'Países Bajos', awayTeam: 'Suecia', homeCode: 'NED', awayCode: 'SWE', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'F4', group: 'F', matchday: 2, date: '2026-06-20', time: '23:00', homeTeam: 'Túnez', awayTeam: 'Japón', homeCode: 'TUN', awayCode: 'JPN', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 3
  { id: 'F5', group: 'F', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Japón', awayTeam: 'Suecia', homeCode: 'JPN', awayCode: 'SWE', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'F6', group: 'F', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Países Bajos', awayTeam: 'Túnez', homeCode: 'NED', awayCode: 'TUN', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP G — Belgium, Egypt, Iran, New Zealand
// ═══════════════════════════════════════════════════════════════
const GROUP_G: Match[] = [
  // Matchday 1
  { id: 'G1', group: 'G', matchday: 1, date: '2026-06-15', time: '20:00', homeTeam: 'Bélgica', awayTeam: 'Egipto', homeCode: 'BEL', awayCode: 'EGY', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'G2', group: 'G', matchday: 1, date: '2026-06-15', time: '23:00', homeTeam: 'Irán', awayTeam: 'Nueva Zelanda', homeCode: 'IRN', awayCode: 'NZL', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  // Matchday 2
  { id: 'G3', group: 'G', matchday: 2, date: '2026-06-21', time: '20:00', homeTeam: 'Bélgica', awayTeam: 'Irán', homeCode: 'BEL', awayCode: 'IRN', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  { id: 'G4', group: 'G', matchday: 2, date: '2026-06-21', time: '23:00', homeTeam: 'Nueva Zelanda', awayTeam: 'Egipto', homeCode: 'NZL', awayCode: 'EGY', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  // Matchday 3
  { id: 'G5', group: 'G', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Egipto', awayTeam: 'Bélgica', homeCode: 'EGY', awayCode: 'BEL', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'G6', group: 'G', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Irán', awayTeam: 'Nueva Zelanda', homeCode: 'IRN', awayCode: 'NZL', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP H — Spain, Saudi Arabia, Uruguay, Cabo Verde
// ═══════════════════════════════════════════════════════════════
const GROUP_H: Match[] = [
  // Matchday 1
  { id: 'H1', group: 'H', matchday: 1, date: '2026-06-15', time: '23:00', homeTeam: 'España', awayTeam: 'Cabo Verde', homeCode: 'ESP', awayCode: 'CPV', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'H2', group: 'H', matchday: 1, date: '2026-06-15', time: '23:00', homeTeam: 'Arabia Saudita', awayTeam: 'Uruguay', homeCode: 'KSA', awayCode: 'URU', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  // Matchday 2
  { id: 'H3', group: 'H', matchday: 2, date: '2026-06-21', time: '20:00', homeTeam: 'España', awayTeam: 'Arabia Saudita', homeCode: 'ESP', awayCode: 'KSA', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  { id: 'H4', group: 'H', matchday: 2, date: '2026-06-21', time: '23:00', homeTeam: 'Uruguay', awayTeam: 'Cabo Verde', homeCode: 'URU', awayCode: 'CPV', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  // Matchday 3
  { id: 'H5', group: 'H', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Uruguay', awayTeam: 'España', homeCode: 'URU', awayCode: 'ESP', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'H6', group: 'H', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Cabo Verde', awayTeam: 'Arabia Saudita', homeCode: 'CPV', awayCode: 'KSA', venue: 'Levi\'s Stadium', city: 'San Francisco', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP I — France, Senegal, Iraq, Norway
// ═══════════════════════════════════════════════════════════════
const GROUP_I: Match[] = [
  // Matchday 1
  { id: 'I1', group: 'I', matchday: 1, date: '2026-06-16', time: '17:00', homeTeam: 'Francia', awayTeam: 'Senegal', homeCode: 'FRA', awayCode: 'SEN', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'I2', group: 'I', matchday: 1, date: '2026-06-16', time: '20:00', homeTeam: 'Irak', awayTeam: 'Noruega', homeCode: 'IRQ', awayCode: 'NOR', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 2
  { id: 'I3', group: 'I', matchday: 2, date: '2026-06-22', time: '17:00', homeTeam: 'Francia', awayTeam: 'Irak', homeCode: 'FRA', awayCode: 'IRQ', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'I4', group: 'I', matchday: 2, date: '2026-06-22', time: '20:00', homeTeam: 'Noruega', awayTeam: 'Senegal', homeCode: 'NOR', awayCode: 'SEN', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 3
  { id: 'I5', group: 'I', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Senegal', awayTeam: 'Francia', homeCode: 'SEN', awayCode: 'FRA', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  { id: 'I6', group: 'I', matchday: 3, date: '2026-06-26', time: '02:00', homeTeam: 'Noruega', awayTeam: 'Irak', homeCode: 'NOR', awayCode: 'IRQ', venue: 'BMO Field', city: 'Toronto', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP J — Argentina, Algeria, Austria, Jordan
// ═══════════════════════════════════════════════════════════════
const GROUP_J: Match[] = [
  // Matchday 1
  { id: 'J1', group: 'J', matchday: 1, date: '2026-06-16', time: '20:00', homeTeam: 'Argentina', awayTeam: 'Argelia', homeCode: 'ARG', awayCode: 'ALG', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  { id: 'J2', group: 'J', matchday: 1, date: '2026-06-17', time: '17:00', homeTeam: 'Austria', awayTeam: 'Jordania', homeCode: 'AUT', awayCode: 'JOR', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
  // Matchday 2
  { id: 'J3', group: 'J', matchday: 2, date: '2026-06-22', time: '20:00', homeTeam: 'Argentina', awayTeam: 'Austria', homeCode: 'ARG', awayCode: 'AUT', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'J4', group: 'J', matchday: 2, date: '2026-06-23', time: '02:00', homeTeam: 'Jordania', awayTeam: 'Argelia', homeCode: 'JOR', awayCode: 'ALG', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  // Matchday 3
  { id: 'J5', group: 'J', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'Argentina', awayTeam: 'Jordania', homeCode: 'ARG', awayCode: 'JOR', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'J6', group: 'J', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'Argelia', awayTeam: 'Austria', homeCode: 'ALG', awayCode: 'AUT', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP K — Portugal, RD Congo, Uzbekistan, Colombia
// ═══════════════════════════════════════════════════════════════
const GROUP_K: Match[] = [
  // Matchday 1
  { id: 'K1', group: 'K', matchday: 1, date: '2026-06-17', time: '17:00', homeTeam: 'Portugal', awayTeam: 'RD Congo', homeCode: 'POR', awayCode: 'COD', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  { id: 'K2', group: 'K', matchday: 1, date: '2026-06-17', time: '20:00', homeTeam: 'Uzbekistán', awayTeam: 'Colombia', homeCode: 'UZB', awayCode: 'COL', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  // Matchday 2
  { id: 'K3', group: 'K', matchday: 2, date: '2026-06-23', time: '17:00', homeTeam: 'Portugal', awayTeam: 'Uzbekistán', homeCode: 'POR', awayCode: 'UZB', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'K4', group: 'K', matchday: 2, date: '2026-06-23', time: '20:00', homeTeam: 'Colombia', awayTeam: 'RD Congo', homeCode: 'COL', awayCode: 'COD', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  // Matchday 3
  { id: 'K5', group: 'K', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'Portugal', awayTeam: 'Colombia', homeCode: 'POR', awayCode: 'COL', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'K6', group: 'K', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'RD Congo', awayTeam: 'Uzbekistán', homeCode: 'COD', awayCode: 'UZB', venue: 'Levi\'s Stadium', city: 'San Francisco', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP L — England, Croatia, Ghana, Panama
// ═══════════════════════════════════════════════════════════════
const GROUP_L: Match[] = [
  // Matchday 1
  { id: 'L1', group: 'L', matchday: 1, date: '2026-06-17', time: '20:00', homeTeam: 'Inglaterra', awayTeam: 'Croacia', homeCode: 'ENG', awayCode: 'CRO', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'L2', group: 'L', matchday: 1, date: '2026-06-17', time: '23:00', homeTeam: 'Ghana', awayTeam: 'Panamá', homeCode: 'GHA', awayCode: 'PAN', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  // Matchday 2
  { id: 'L3', group: 'L', matchday: 2, date: '2026-06-23', time: '20:00', homeTeam: 'Inglaterra', awayTeam: 'Ghana', homeCode: 'ENG', awayCode: 'GHA', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  { id: 'L4', group: 'L', matchday: 2, date: '2026-06-23', time: '23:00', homeTeam: 'Panamá', awayTeam: 'Croacia', homeCode: 'PAN', awayCode: 'CRO', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  // Matchday 3
  { id: 'L5', group: 'L', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'Inglaterra', awayTeam: 'Panamá', homeCode: 'ENG', awayCode: 'PAN', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'L6', group: 'L', matchday: 3, date: '2026-06-27', time: '02:00', homeTeam: 'Croacia', awayTeam: 'Ghana', homeCode: 'CRO', awayCode: 'GHA', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// KNOCKOUT ROUNDS
// ═══════════════════════════════════════════════════════════════

// ─── ROUND OF 32 (Dieciseisavos) ──────────────────────────────
const ROUND_OF_32: Match[] = [
  // Sunday June 28
  { id: 'R32-1', group: '-', matchday: 0, date: '2026-06-28', time: '18:00', homeTeam: '1° Grupo A', awayTeam: '2° Grupo C', homeCode: '1A', awayCode: '2C', venue: 'MetLife Stadium', city: 'New York', round: 'round-32', isTBD: true },
  { id: 'R32-2', group: '-', matchday: 0, date: '2026-06-28', time: '22:00', homeTeam: '2° Grupo A', awayTeam: '2° Grupo B', homeCode: '2A', awayCode: '2B', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'round-32', isTBD: true },
  // Monday June 29
  { id: 'R32-3', group: '-', matchday: 0, date: '2026-06-29', time: '18:00', homeTeam: '1° Grupo B', awayTeam: '3° Grupo E/F/G', homeCode: '1B', awayCode: '3EFG', venue: 'NRG Stadium', city: 'Houston', round: 'round-32', isTBD: true },
  { id: 'R32-4', group: '-', matchday: 0, date: '2026-06-29', time: '22:00', homeTeam: '1° Grupo C', awayTeam: '3° Grupo A/B/F', homeCode: '1C', awayCode: '3ABF', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'round-32', isTBD: true },
  // Tuesday June 30
  { id: 'R32-5', group: '-', matchday: 0, date: '2026-06-30', time: '18:00', homeTeam: '2° Grupo F', awayTeam: '2° Grupo G', homeCode: '2F', awayCode: '2G', venue: 'Hard Rock Stadium', city: 'Miami', round: 'round-32', isTBD: true },
  { id: 'R32-6', group: '-', matchday: 0, date: '2026-06-30', time: '22:00', homeTeam: '1° Grupo I', awayTeam: '3° Grupo C/D/E', homeCode: '1I', awayCode: '3CDE', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'round-32', isTBD: true },
  // Wednesday July 1
  { id: 'R32-7', group: '-', matchday: 0, date: '2026-07-01', time: '18:00', homeTeam: '1° Grupo E', awayTeam: '2° Grupo D', homeCode: '1E', awayCode: '2D', venue: 'Estadio Azteca', city: 'Mexico City', round: 'round-32', isTBD: true },
  { id: 'R32-8', group: '-', matchday: 0, date: '2026-07-01', time: '22:00', homeTeam: '1° Grupo F', awayTeam: '3° Grupo B/C/G', homeCode: '1F', awayCode: '3BCG', venue: 'Estadio BBVA', city: 'Monterrey', round: 'round-32', isTBD: true },
  // Thursday July 2
  { id: 'R32-9', group: '-', matchday: 0, date: '2026-07-02', time: '18:00', homeTeam: '2° Grupo K', awayTeam: '2° Grupo L', homeCode: '2K', awayCode: '2L', venue: 'Lumen Field', city: 'Seattle', round: 'round-32', isTBD: true },
  { id: 'R32-10', group: '-', matchday: 0, date: '2026-07-02', time: '22:00', homeTeam: '1° Grupo H', awayTeam: '2° Grupo J', homeCode: '1H', awayCode: '2J', venue: 'Gillette Stadium', city: 'Boston', round: 'round-32', isTBD: true },
  // Friday July 3
  { id: 'R32-11', group: '-', matchday: 0, date: '2026-07-03', time: '18:00', homeTeam: '1° Grupo J', awayTeam: '2° Grupo H', homeCode: '1J', awayCode: '2H', venue: 'BC Place', city: 'Vancouver', round: 'round-32', isTBD: true },
  { id: 'R32-12', group: '-', matchday: 0, date: '2026-07-03', time: '22:00', homeTeam: '1° Grupo K', awayTeam: '3° Grupo D/E/I/J/L', homeCode: '1K', awayCode: '3DEIJL', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'round-32', isTBD: true },
  // Saturday July 4
  { id: 'R32-13', group: '-', matchday: 0, date: '2026-07-04', time: '18:00', homeTeam: '1° Grupo D', awayTeam: '3° Grupo B/E/F', homeCode: '1D', awayCode: '3BEF', venue: 'NRG Stadium', city: 'Houston', round: 'round-32', isTBD: true },
  { id: 'R32-14', group: '-', matchday: 0, date: '2026-07-04', time: '22:00', homeTeam: '1° Grupo G', awayTeam: '3° Grupo A/E/H', homeCode: '1G', awayCode: '3AEH', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'round-32', isTBD: true },
];

// ─── ROUND OF 16 (Octavos) ────────────────────────────────────
const ROUND_OF_16: Match[] = [
  // Saturday July 4
  { id: 'R16-1', group: '-', matchday: 0, date: '2026-07-04', time: '18:00', homeTeam: 'Ganador R32-1', awayTeam: 'Ganador R32-3', homeCode: 'W1', awayCode: 'W3', venue: 'MetLife Stadium', city: 'New York', round: 'round-16', isTBD: true },
  { id: 'R16-2', group: '-', matchday: 0, date: '2026-07-04', time: '22:00', homeTeam: 'Ganador R32-2', awayTeam: 'Ganador R32-4', homeCode: 'W2', awayCode: 'W4', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'round-16', isTBD: true },
  // Sunday July 5
  { id: 'R16-3', group: '-', matchday: 0, date: '2026-07-05', time: '18:00', homeTeam: 'Ganador R32-5', awayTeam: 'Ganador R32-6', homeCode: 'W5', awayCode: 'W6', venue: 'Hard Rock Stadium', city: 'Miami', round: 'round-16', isTBD: true },
  { id: 'R16-4', group: '-', matchday: 0, date: '2026-07-05', time: '22:00', homeTeam: 'Ganador R32-7', awayTeam: 'Ganador R32-8', homeCode: 'W7', awayCode: 'W8', venue: 'Estadio Azteca', city: 'Mexico City', round: 'round-16', isTBD: true },
  // Monday July 6
  { id: 'R16-5', group: '-', matchday: 0, date: '2026-07-06', time: '18:00', homeTeam: 'Ganador R32-9', awayTeam: 'Ganador R32-10', homeCode: 'W9', awayCode: 'W10', venue: 'NRG Stadium', city: 'Houston', round: 'round-16', isTBD: true },
  { id: 'R16-6', group: '-', matchday: 0, date: '2026-07-06', time: '22:00', homeTeam: 'Ganador R32-11', awayTeam: 'Ganador R32-12', homeCode: 'W11', awayCode: 'W12', venue: 'Lumen Field', city: 'Seattle', round: 'round-16', isTBD: true },
  // Tuesday July 7
  { id: 'R16-7', group: '-', matchday: 0, date: '2026-07-07', time: '18:00', homeTeam: 'Ganador R32-13', awayTeam: 'Ganador R32-14', homeCode: 'W13', awayCode: 'W14', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'round-16', isTBD: true },
  // Wednesday July 8
  { id: 'R16-8', group: '-', matchday: 0, date: '2026-07-08', time: '22:00', homeTeam: 'TBD', awayTeam: 'TBD', homeCode: 'TBD', awayCode: 'TBD', venue: 'TBD', city: 'TBD', round: 'round-16', isTBD: true },
];

// ─── QUARTER-FINALS (Cuartos) ─────────────────────────────────
const QUARTER_FINALS: Match[] = [
  // Thursday July 9
  { id: 'QF-1', group: '-', matchday: 0, date: '2026-07-09', time: '20:00', homeTeam: 'Ganador R16-1', awayTeam: 'Ganador R16-3', homeCode: 'W16-1', awayCode: 'W16-3', venue: 'MetLife Stadium', city: 'New York', round: 'quarter', isTBD: true },
  // Friday July 10
  { id: 'QF-2', group: '-', matchday: 0, date: '2026-07-10', time: '20:00', homeTeam: 'Ganador R16-2', awayTeam: 'Ganador R16-4', homeCode: 'W16-2', awayCode: 'W16-4', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'quarter', isTBD: true },
  // Saturday July 11
  { id: 'QF-3', group: '-', matchday: 0, date: '2026-07-11', time: '18:00', homeTeam: 'Ganador R16-5', awayTeam: 'Ganador R16-7', homeCode: 'W16-5', awayCode: 'W16-7', venue: 'Estadio Azteca', city: 'Mexico City', round: 'quarter', isTBD: true },
  { id: 'QF-4', group: '-', matchday: 0, date: '2026-07-11', time: '22:00', homeTeam: 'Ganador R16-6', awayTeam: 'Ganador R16-?', homeCode: 'W16-6', awayCode: 'W16-?', venue: 'NRG Stadium', city: 'Houston', round: 'quarter', isTBD: true },
];

// ─── SEMI-FINALS ──────────────────────────────────────────────
const SEMI_FINALS: Match[] = [
  // Tuesday July 14
  { id: 'SF-1', group: '-', matchday: 0, date: '2026-07-14', time: '20:00', homeTeam: 'Ganador QF-1', awayTeam: 'Ganador QF-2', homeCode: 'QF1', awayCode: 'QF2', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'semi', isTBD: true },
  // Wednesday July 15
  { id: 'SF-2', group: '-', matchday: 0, date: '2026-07-15', time: '20:00', homeTeam: 'Ganador QF-3', awayTeam: 'Ganador QF-4', homeCode: 'QF3', awayCode: 'QF4', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'semi', isTBD: true },
];

// ─── THIRD PLACE ──────────────────────────────────────────────
const THIRD_PLACE: Match[] = [
  // Saturday July 18
  { id: 'TP-1', group: '-', matchday: 0, date: '2026-07-18', time: '20:00', homeTeam: 'Perdedor SF-1', awayTeam: 'Perdedor SF-2', homeCode: 'L-SF1', awayCode: 'L-SF2', venue: 'Hard Rock Stadium', city: 'Miami', round: 'third', isTBD: true },
];

// ─── FINAL ────────────────────────────────────────────────────
const FINAL: Match[] = [
  // Sunday July 19
  { id: 'FINAL', group: '-', matchday: 0, date: '2026-07-19', time: '20:00', homeTeam: 'Ganador SF-1', awayTeam: 'Ganador SF-2', homeCode: 'W-SF1', awayCode: 'W-SF2', venue: 'MetLife Stadium', city: 'New York', round: 'final', isTBD: true },
];

// ═══════════════════════════════════════════════════════════════
// ALL MATCHES
// ═══════════════════════════════════════════════════════════════
export const matches: Match[] = [
  // Group Stage (72 matches)
  ...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D,
  ...GROUP_E, ...GROUP_F, ...GROUP_G, ...GROUP_H,
  ...GROUP_I, ...GROUP_J, ...GROUP_K, ...GROUP_L,
  // Knockout Stage (28 matches)
  ...ROUND_OF_32, ...ROUND_OF_16, ...QUARTER_FINALS,
  ...SEMI_FINALS, ...THIRD_PLACE, ...FINAL,
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export type GroupId = typeof GROUPS[number];

export type Round = 'group' | 'round-32' | 'round-16' | 'quarter' | 'semi' | 'third' | 'final';

/** Get all matches for a given group */
export function getMatchesByGroup(group: string): Match[] {
  return matches.filter((m) => m.group === group);
}

/** Get a match by its ID (e.g. 'A1', 'B5', 'FINAL') */
export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

/** Get all non-TBD matches (confirmed fixtures only) */
export function getConfirmedMatches(): Match[] {
  return matches.filter((m) => !m.isTBD);
}

/** Get matches by round */
export function getMatchesByRound(round: Round): Match[] {
  return matches.filter((m) => m.round === round);
}

/** Get all group stage matches */
export function getGroupStageMatches(): Match[] {
  return matches.filter((m) => m.round === 'group');
}

/** Get all knockout matches */
export function getKnockoutMatches(): Match[] {
  return matches.filter((m) => m.round !== 'group');
}

/** Format a match for display */
export function formatMatchDate(match: Match): string {
  const date = new Date(`${match.date}T${match.time}:00Z`);
  return date.toLocaleDateString('es-BO', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMatchTime(match: Match): string {
  return `${match.time} UTC`;
}

/** Get country flag emoji from team name using teams.ts data */
export function getTeamFlag(teamName: string): string {
  const team = getTeamByName(teamName);
  return team?.flag || '🏳️';
}

/** Get round display name in Spanish */
export function getRoundName(round: Round): string {
  const names: Record<Round, string> = {
    'group': 'Fase de Grupos',
    'round-32': 'Dieciseisavos de Final',
    'round-16': 'Octavos de Final',
    'quarter': 'Cuartos de Final',
    'semi': 'Semifinales',
    'third': 'Tercer Puesto',
    'final': 'La Gran Final',
  };
  return names[round];
}
