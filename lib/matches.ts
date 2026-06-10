// FORCH.i ORACLE — FIFA World Cup 2026 Official Schedule
// 48 teams in 12 groups of 4 → 72 group stage matches + 56 knockout matches
// Fuente: FIFA.com — Calendario oficial publicado
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
// GROUP A — Mexico, South Africa, South Korea, Czech Republic
// ═══════════════════════════════════════════════════════════════
const GROUP_A: Match[] = [
  // Matchday 1 — June 11
  { id: 'A1', group: 'A', matchday: 1, date: '2026-06-11', time: '19:00', homeTeam: 'México', awayTeam: 'Sudáfrica', homeCode: 'MEX', awayCode: 'RSA', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  { id: 'A3', group: 'A', matchday: 1, date: '2026-06-12', time: '02:00', homeTeam: 'Corea del Sur', awayTeam: 'Chequia', homeCode: 'KOR', awayCode: 'CZE', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 2 — June 18
  { id: 'A2', group: 'A', matchday: 2, date: '2026-06-18', time: '16:00', homeTeam: 'Chequia', awayTeam: 'Sudáfrica', homeCode: 'CZE', awayCode: 'RSA', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  { id: 'A4', group: 'A', matchday: 2, date: '2026-06-19', time: '01:00', homeTeam: 'México', awayTeam: 'Corea del Sur', homeCode: 'MEX', awayCode: 'KOR', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 3 — June 24
  { id: 'A5', group: 'A', matchday: 3, date: '2026-06-25', time: '01:00', homeTeam: 'Chequia', awayTeam: 'México', homeCode: 'CZE', awayCode: 'MEX', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  { id: 'A6', group: 'A', matchday: 3, date: '2026-06-25', time: '01:00', homeTeam: 'Sudáfrica', awayTeam: 'Corea del Sur', homeCode: 'RSA', awayCode: 'KOR', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP B — Canada, Bosnia and Herzegovina, Qatar, Switzerland
// ═══════════════════════════════════════════════════════════════
const GROUP_B: Match[] = [
  // Matchday 1
  { id: 'B1', group: 'B', matchday: 1, date: '2026-06-12', time: '19:00', homeTeam: 'Canadá', awayTeam: 'Bosnia y Herzegovina', homeCode: 'CAN', awayCode: 'BIH', venue: 'BMO Field', city: 'Toronto', round: 'group' },
  { id: 'B3', group: 'B', matchday: 1, date: '2026-06-13', time: '16:00', homeTeam: 'Qatar', awayTeam: 'Suiza', homeCode: 'QAT', awayCode: 'SUI', venue: "Levi's Stadium", city: 'Santa Clara', round: 'group' },
  // Matchday 2
  { id: 'B2', group: 'B', matchday: 2, date: '2026-06-18', time: '16:00', homeTeam: 'Suiza', awayTeam: 'Bosnia y Herzegovina', homeCode: 'SUI', awayCode: 'BIH', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'B4', group: 'B', matchday: 2, date: '2026-06-18', time: '19:00', homeTeam: 'Canadá', awayTeam: 'Qatar', homeCode: 'CAN', awayCode: 'QAT', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 3
  { id: 'B5', group: 'B', matchday: 3, date: '2026-06-24', time: '16:00', homeTeam: 'Suiza', awayTeam: 'Canadá', homeCode: 'SUI', awayCode: 'CAN', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  { id: 'B6', group: 'B', matchday: 3, date: '2026-06-24', time: '16:00', homeTeam: 'Bosnia y Herzegovina', awayTeam: 'Qatar', homeCode: 'BIH', awayCode: 'QAT', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP C — Brazil, Morocco, Haiti, Scotland
// ═══════════════════════════════════════════════════════════════
const GROUP_C: Match[] = [
  // Matchday 1
  { id: 'C1', group: 'C', matchday: 1, date: '2026-06-13', time: '22:00', homeTeam: 'Brasil', awayTeam: 'Marruecos', homeCode: 'BRA', awayCode: 'MAR', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'C3', group: 'C', matchday: 1, date: '2026-06-14', time: '01:00', homeTeam: 'Haití', awayTeam: 'Escocia', homeCode: 'HTI', awayCode: 'SCO', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  // Matchday 2
  { id: 'C2', group: 'C', matchday: 2, date: '2026-06-20', time: '00:00', homeTeam: 'Escocia', awayTeam: 'Marruecos', homeCode: 'SCO', awayCode: 'MAR', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'C4', group: 'C', matchday: 2, date: '2026-06-20', time: '00:30', homeTeam: 'Brasil', awayTeam: 'Haití', homeCode: 'BRA', awayCode: 'HTI', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  // Matchday 3
  { id: 'C5', group: 'C', matchday: 3, date: '2026-06-25', time: '00:00', homeTeam: 'Escocia', awayTeam: 'Brasil', homeCode: 'SCO', awayCode: 'BRA', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  { id: 'C6', group: 'C', matchday: 3, date: '2026-06-25', time: '00:00', homeTeam: 'Marruecos', awayTeam: 'Haití', homeCode: 'MAR', awayCode: 'HTI', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP D — United States, Paraguay, Australia, Turkey
// ═══════════════════════════════════════════════════════════════
const GROUP_D: Match[] = [
  // Matchday 1
  { id: 'D1', group: 'D', matchday: 1, date: '2026-06-12', time: '22:00', homeTeam: 'Estados Unidos', awayTeam: 'Paraguay', homeCode: 'USA', awayCode: 'PAR', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'D3', group: 'D', matchday: 1, date: '2026-06-14', time: '01:00', homeTeam: 'Australia', awayTeam: 'Turquía', homeCode: 'AUS', awayCode: 'TUR', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 2
  { id: 'D2', group: 'D', matchday: 2, date: '2026-06-19', time: '16:00', homeTeam: 'Estados Unidos', awayTeam: 'Australia', homeCode: 'USA', awayCode: 'AUS', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  { id: 'D4', group: 'D', matchday: 2, date: '2026-06-20', time: '00:00', homeTeam: 'Turquía', awayTeam: 'Paraguay', homeCode: 'TUR', awayCode: 'PAR', venue: "Levi's Stadium", city: 'Santa Clara', round: 'group' },
  // Matchday 3
  { id: 'D5', group: 'D', matchday: 3, date: '2026-06-26', time: '01:00', homeTeam: 'Turquía', awayTeam: 'Estados Unidos', homeCode: 'TUR', awayCode: 'USA', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'D6', group: 'D', matchday: 3, date: '2026-06-26', time: '01:00', homeTeam: 'Paraguay', awayTeam: 'Australia', homeCode: 'PAR', awayCode: 'AUS', venue: "Levi's Stadium", city: 'Santa Clara', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP E — Germany, Curacao, Ivory Coast, Ecuador
// ═══════════════════════════════════════════════════════════════
const GROUP_E: Match[] = [
  // Matchday 1
  { id: 'E1', group: 'E', matchday: 1, date: '2026-06-14', time: '16:00', homeTeam: 'Alemania', awayTeam: 'Curazao', homeCode: 'GER', awayCode: 'CUW', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'E3', group: 'E', matchday: 1, date: '2026-06-14', time: '23:00', homeTeam: 'Costa de Marfil', awayTeam: 'Ecuador', homeCode: 'CIV', awayCode: 'ECU', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  // Matchday 2
  { id: 'E2', group: 'E', matchday: 2, date: '2026-06-20', time: '20:00', homeTeam: 'Alemania', awayTeam: 'Costa de Marfil', homeCode: 'GER', awayCode: 'CIV', venue: 'BMO Field', city: 'Toronto', round: 'group' },
  { id: 'E4', group: 'E', matchday: 2, date: '2026-06-21', time: '01:00', homeTeam: 'Ecuador', awayTeam: 'Curazao', homeCode: 'ECU', awayCode: 'CUW', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  // Matchday 3
  { id: 'E5', group: 'E', matchday: 3, date: '2026-06-25', time: '20:00', homeTeam: 'Curazao', awayTeam: 'Costa de Marfil', homeCode: 'CUW', awayCode: 'CIV', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  { id: 'E6', group: 'E', matchday: 3, date: '2026-06-25', time: '20:00', homeTeam: 'Ecuador', awayTeam: 'Alemania', homeCode: 'ECU', awayCode: 'GER', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP F — Netherlands, Japan, Sweden, Tunisia
// ═══════════════════════════════════════════════════════════════
const GROUP_F: Match[] = [
  // Matchday 1
  { id: 'F1', group: 'F', matchday: 1, date: '2026-06-14', time: '19:00', homeTeam: 'Países Bajos', awayTeam: 'Japón', homeCode: 'NED', awayCode: 'JPN', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
  { id: 'F3', group: 'F', matchday: 1, date: '2026-06-15', time: '00:00', homeTeam: 'Suecia', awayTeam: 'Túnez', homeCode: 'SWE', awayCode: 'TUN', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
  // Matchday 2
  { id: 'F2', group: 'F', matchday: 2, date: '2026-06-20', time: '16:00', homeTeam: 'Países Bajos', awayTeam: 'Suecia', homeCode: 'NED', awayCode: 'SWE', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'F4', group: 'F', matchday: 2, date: '2026-06-21', time: '04:00', homeTeam: 'Túnez', awayTeam: 'Japón', homeCode: 'TUN', awayCode: 'JPN', venue: 'Estadio BBVA', city: 'Monterrey', round: 'group' },
  // Matchday 3
  { id: 'F5', group: 'F', matchday: 3, date: '2026-06-26', time: '00:00', homeTeam: 'Japón', awayTeam: 'Suecia', homeCode: 'JPN', awayCode: 'SWE', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
  { id: 'F6', group: 'F', matchday: 3, date: '2026-06-26', time: '00:00', homeTeam: 'Túnez', awayTeam: 'Países Bajos', homeCode: 'TUN', awayCode: 'NED', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP G — Belgium, Egypt, Iran, New Zealand
// ═══════════════════════════════════════════════════════════════
const GROUP_G: Match[] = [
  // Matchday 1
  { id: 'G1', group: 'G', matchday: 1, date: '2026-06-15', time: '16:00', homeTeam: 'Bélgica', awayTeam: 'Egipto', homeCode: 'BEL', awayCode: 'EGY', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  { id: 'G3', group: 'G', matchday: 1, date: '2026-06-16', time: '00:00', homeTeam: 'Irán', awayTeam: 'Nueva Zelanda', homeCode: 'IRN', awayCode: 'NZL', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  // Matchday 2
  { id: 'G2', group: 'G', matchday: 2, date: '2026-06-21', time: '16:00', homeTeam: 'Bélgica', awayTeam: 'Irán', homeCode: 'BEL', awayCode: 'IRN', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'group' },
  { id: 'G4', group: 'G', matchday: 2, date: '2026-06-22', time: '00:00', homeTeam: 'Nueva Zelanda', awayTeam: 'Egipto', homeCode: 'NZL', awayCode: 'EGY', venue: 'BC Place', city: 'Vancouver', round: 'group' },
  // Matchday 3
  { id: 'G5', group: 'G', matchday: 3, date: '2026-06-27', time: '00:00', homeTeam: 'Egipto', awayTeam: 'Irán', homeCode: 'EGY', awayCode: 'IRN', venue: 'Lumen Field', city: 'Seattle', round: 'group' },
  { id: 'G6', group: 'G', matchday: 3, date: '2026-06-27', time: '00:00', homeTeam: 'Nueva Zelanda', awayTeam: 'Bélgica', homeCode: 'NZL', awayCode: 'BEL', venue: 'BC Place', city: 'Vancouver', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP H — Spain, Cape Verde, Saudi Arabia, Uruguay
// ═══════════════════════════════════════════════════════════════
const GROUP_H: Match[] = [
  // Matchday 1
  { id: 'H1', group: 'H', matchday: 1, date: '2026-06-15', time: '16:00', homeTeam: 'España', awayTeam: 'Cabo Verde', homeCode: 'ESP', awayCode: 'CPV', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  { id: 'H3', group: 'H', matchday: 1, date: '2026-06-15', time: '22:00', homeTeam: 'Arabia Saudita', awayTeam: 'Uruguay', homeCode: 'KSA', awayCode: 'URU', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  // Matchday 2
  { id: 'H2', group: 'H', matchday: 2, date: '2026-06-21', time: '16:00', homeTeam: 'España', awayTeam: 'Arabia Saudita', homeCode: 'ESP', awayCode: 'KSA', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
  { id: 'H4', group: 'H', matchday: 2, date: '2026-06-21', time: '22:00', homeTeam: 'Uruguay', awayTeam: 'Cabo Verde', homeCode: 'URU', awayCode: 'CPV', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  // Matchday 3
  { id: 'H5', group: 'H', matchday: 3, date: '2026-06-26', time: '23:00', homeTeam: 'Cabo Verde', awayTeam: 'Arabia Saudita', homeCode: 'CPV', awayCode: 'KSA', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'H6', group: 'H', matchday: 3, date: '2026-06-27', time: '00:00', homeTeam: 'Uruguay', awayTeam: 'España', homeCode: 'URU', awayCode: 'ESP', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP I — France, Senegal, Iraq, Norway
// ═══════════════════════════════════════════════════════════════
const GROUP_I: Match[] = [
  // Matchday 1
  { id: 'I1', group: 'I', matchday: 1, date: '2026-06-16', time: '19:00', homeTeam: 'Francia', awayTeam: 'Senegal', homeCode: 'FRA', awayCode: 'SEN', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'I3', group: 'I', matchday: 1, date: '2026-06-16', time: '22:00', homeTeam: 'Irak', awayTeam: 'Noruega', homeCode: 'IRQ', awayCode: 'NOR', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  // Matchday 2
  { id: 'I2', group: 'I', matchday: 2, date: '2026-06-22', time: '21:00', homeTeam: 'Francia', awayTeam: 'Irak', homeCode: 'FRA', awayCode: 'IRQ', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
  { id: 'I4', group: 'I', matchday: 2, date: '2026-06-23', time: '00:00', homeTeam: 'Noruega', awayTeam: 'Senegal', homeCode: 'NOR', awayCode: 'SEN', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  // Matchday 3
  { id: 'I5', group: 'I', matchday: 3, date: '2026-06-26', time: '19:00', homeTeam: 'Noruega', awayTeam: 'Francia', homeCode: 'NOR', awayCode: 'FRA', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'I6', group: 'I', matchday: 3, date: '2026-06-26', time: '19:00', homeTeam: 'Senegal', awayTeam: 'Irak', homeCode: 'SEN', awayCode: 'IRQ', venue: 'BMO Field', city: 'Toronto', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP J — Argentina, Algeria, Austria, Jordan
// ═══════════════════════════════════════════════════════════════
const GROUP_J: Match[] = [
  // Matchday 1
  { id: 'J1', group: 'J', matchday: 1, date: '2026-06-17', time: '00:00', homeTeam: 'Argentina', awayTeam: 'Argelia', homeCode: 'ARG', awayCode: 'ALG', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'J3', group: 'J', matchday: 1, date: '2026-06-17', time: '01:00', homeTeam: 'Austria', awayTeam: 'Jordania', homeCode: 'AUT', awayCode: 'JOR', venue: "Levi's Stadium", city: 'Santa Clara', round: 'group' },
  // Matchday 2
  { id: 'J2', group: 'J', matchday: 2, date: '2026-06-22', time: '16:00', homeTeam: 'Argentina', awayTeam: 'Austria', homeCode: 'ARG', awayCode: 'AUT', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
  { id: 'J4', group: 'J', matchday: 2, date: '2026-06-23', time: '00:00', homeTeam: 'Jordania', awayTeam: 'Argelia', homeCode: 'JOR', awayCode: 'ALG', venue: "Levi's Stadium", city: 'Santa Clara', round: 'group' },
  // Matchday 3
  { id: 'J5', group: 'J', matchday: 3, date: '2026-06-28', time: '01:00', homeTeam: 'Argelia', awayTeam: 'Austria', homeCode: 'ALG', awayCode: 'AUT', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'group' },
  { id: 'J6', group: 'J', matchday: 3, date: '2026-06-28', time: '01:00', homeTeam: 'Jordania', awayTeam: 'Argentina', homeCode: 'JOR', awayCode: 'ARG', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP K — Portugal, DR Congo, Uzbekistan, Colombia
// ═══════════════════════════════════════════════════════════════
const GROUP_K: Match[] = [
  // Matchday 1
  { id: 'K1', group: 'K', matchday: 1, date: '2026-06-17', time: '16:00', homeTeam: 'Portugal', awayTeam: 'RD Congo', homeCode: 'POR', awayCode: 'COD', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'K3', group: 'K', matchday: 1, date: '2026-06-18', time: '00:00', homeTeam: 'Uzbekistán', awayTeam: 'Colombia', homeCode: 'UZB', awayCode: 'COL', venue: 'Estadio Azteca', city: 'Mexico City', round: 'group' },
  // Matchday 2
  { id: 'K2', group: 'K', matchday: 2, date: '2026-06-23', time: '16:00', homeTeam: 'Portugal', awayTeam: 'Uzbekistán', homeCode: 'POR', awayCode: 'UZB', venue: 'NRG Stadium', city: 'Houston', round: 'group' },
  { id: 'K4', group: 'K', matchday: 2, date: '2026-06-24', time: '00:00', homeTeam: 'Colombia', awayTeam: 'RD Congo', homeCode: 'COL', awayCode: 'COD', venue: 'Estadio Akron', city: 'Guadalajara', round: 'group' },
  // Matchday 3
  { id: 'K5', group: 'K', matchday: 3, date: '2026-06-27', time: '23:30', homeTeam: 'Colombia', awayTeam: 'Portugal', homeCode: 'COL', awayCode: 'POR', venue: 'Hard Rock Stadium', city: 'Miami', round: 'group' },
  { id: 'K6', group: 'K', matchday: 3, date: '2026-06-27', time: '23:30', homeTeam: 'RD Congo', awayTeam: 'Uzbekistán', homeCode: 'COD', awayCode: 'UZB', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// GROUP L — England, Croatia, Ghana, Panama
// ═══════════════════════════════════════════════════════════════
const GROUP_L: Match[] = [
  // Matchday 1
  { id: 'L1', group: 'L', matchday: 1, date: '2026-06-17', time: '19:00', homeTeam: 'Inglaterra', awayTeam: 'Croacia', homeCode: 'ENG', awayCode: 'CRO', venue: 'AT&T Stadium', city: 'Dallas', round: 'group' },
  { id: 'L3', group: 'L', matchday: 1, date: '2026-06-17', time: '23:00', homeTeam: 'Ghana', awayTeam: 'Panamá', homeCode: 'GHA', awayCode: 'PAN', venue: 'BMO Field', city: 'Toronto', round: 'group' },
  // Matchday 2
  { id: 'L2', group: 'L', matchday: 2, date: '2026-06-23', time: '20:00', homeTeam: 'Inglaterra', awayTeam: 'Ghana', homeCode: 'ENG', awayCode: 'GHA', venue: 'Gillette Stadium', city: 'Boston', round: 'group' },
  { id: 'L4', group: 'L', matchday: 2, date: '2026-06-23', time: '23:00', homeTeam: 'Panamá', awayTeam: 'Croacia', homeCode: 'PAN', awayCode: 'CRO', venue: 'BMO Field', city: 'Toronto', round: 'group' },
  // Matchday 3
  { id: 'L5', group: 'L', matchday: 3, date: '2026-06-27', time: '21:00', homeTeam: 'Panamá', awayTeam: 'Inglaterra', homeCode: 'PAN', awayCode: 'ENG', venue: 'MetLife Stadium', city: 'New York', round: 'group' },
  { id: 'L6', group: 'L', matchday: 3, date: '2026-06-27', time: '21:00', homeTeam: 'Croacia', awayTeam: 'Ghana', homeCode: 'CRO', awayCode: 'GHA', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'group' },
];

// ═══════════════════════════════════════════════════════════════
// KNOCKOUT STAGE — Round of 32 (48 teams → 24 + 8 best 3rd)
// ═══════════════════════════════════════════════════════════════

const ROUND_OF_32: Match[] = [
  // June 28-29: R32-1 to R32-8
  { id: 'R32-1', group: 'R32', matchday: 1, date: '2026-06-28', time: '16:00', homeTeam: '1A', awayTeam: '3B/3E/3F/3G', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'round-32' },
  { id: 'R32-2', group: 'R32', matchday: 1, date: '2026-06-28', time: '18:00', homeTeam: '1C', awayTeam: '3A/3B/3C/3D', homeCode: '', awayCode: '', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'round-32' },
  { id: 'R32-3', group: 'R32', matchday: 1, date: '2026-06-28', time: '20:00', homeTeam: '1E', awayTeam: '3D/3E/3F', homeCode: '', awayCode: '', venue: 'NRG Stadium', city: 'Houston', round: 'round-32' },
  { id: 'R32-4', group: 'R32', matchday: 1, date: '2026-06-28', time: '22:00', homeTeam: '1G', awayTeam: '3C/3G/3H', homeCode: '', awayCode: '', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'round-32' },
  { id: 'R32-5', group: 'R32', matchday: 1, date: '2026-06-29', time: '16:00', homeTeam: '1B', awayTeam: '3A/3B/3C', homeCode: '', awayCode: '', venue: 'AT&T Stadium', city: 'Dallas', round: 'round-32' },
  { id: 'R32-6', group: 'R32', matchday: 1, date: '2026-06-29', time: '18:00', homeTeam: '1D', awayTeam: '3D/3E/3F', homeCode: '', awayCode: '', venue: 'Lincoln Financial Field', city: 'Philadelphia', round: 'round-32' },
  { id: 'R32-7', group: 'R32', matchday: 1, date: '2026-06-29', time: '20:00', homeTeam: '1F', awayTeam: '3A/3B/3C', homeCode: '', awayCode: '', venue: "Levi's Stadium", city: 'Santa Clara', round: 'round-32' },
  { id: 'R32-8', group: 'R32', matchday: 1, date: '2026-06-29', time: '22:00', homeTeam: '1H', awayTeam: '3G/3H/3A', homeCode: '', awayCode: '', venue: 'Estadio Azteca', city: 'Mexico City', round: 'round-32' },

  // June 30 - July 1: R32-9 to R32-16
  { id: 'R32-9', group: 'R32', matchday: 2, date: '2026-06-30', time: '16:00', homeTeam: '2A', awayTeam: '2B', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'round-32' },
  { id: 'R32-10', group: 'R32', matchday: 2, date: '2026-06-30', time: '18:00', homeTeam: '2C', awayTeam: '2D', homeCode: '', awayCode: '', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'round-32' },
  { id: 'R32-11', group: 'R32', matchday: 2, date: '2026-06-30', time: '20:00', homeTeam: '2E', awayTeam: '2F', homeCode: '', awayCode: '', venue: 'NRG Stadium', city: 'Houston', round: 'round-32' },
  { id: 'R32-12', group: 'R32', matchday: 2, date: '2026-06-30', time: '22:00', homeTeam: '2G', awayTeam: '2H', homeCode: '', awayCode: '', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'round-32' },
  { id: 'R32-13', group: 'R32', matchday: 2, date: '2026-07-01', time: '16:00', homeTeam: '1I', awayTeam: '3I/3J/3K/3L', homeCode: '', awayCode: '', venue: 'Gillette Stadium', city: 'Boston', round: 'round-32' },
  { id: 'R32-14', group: 'R32', matchday: 2, date: '2026-07-01', time: '18:00', homeTeam: '1J', awayTeam: '3I/3J/3K/3L', homeCode: '', awayCode: '', venue: 'Arrowhead Stadium', city: 'Kansas City', round: 'round-32' },
  { id: 'R32-15', group: 'R32', matchday: 2, date: '2026-07-01', time: '20:00', homeTeam: '1K', awayTeam: '3K/3L/3I', homeCode: '', awayCode: '', venue: 'Hard Rock Stadium', city: 'Miami', round: 'round-32' },
  { id: 'R32-16', group: 'R32', matchday: 2, date: '2026-07-01', time: '22:00', homeTeam: '1L', awayTeam: '3J/3K/3L', homeCode: '', awayCode: '', venue: 'BMO Field', city: 'Toronto', round: 'round-32' },
];

// ═══════════════════════════════════════════════════════════════
// ROUND OF 16 (16 matches → 8 winners)
// ═══════════════════════════════════════════════════════════════

const ROUND_OF_16: Match[] = [
  { id: 'R16-1', group: 'R16', matchday: 1, date: '2026-07-04', time: '16:00', homeTeam: 'W-R32-1', awayTeam: 'W-R32-2', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'round-16' },
  { id: 'R16-2', group: 'R16', matchday: 1, date: '2026-07-04', time: '18:00', homeTeam: 'W-R32-3', awayTeam: 'W-R32-4', homeCode: '', awayCode: '', venue: 'NRG Stadium', city: 'Houston', round: 'round-16' },
  { id: 'R16-3', group: 'R16', matchday: 1, date: '2026-07-04', time: '20:00', homeTeam: 'W-R32-5', awayTeam: 'W-R32-6', homeCode: '', awayCode: '', venue: 'AT&T Stadium', city: 'Dallas', round: 'round-16' },
  { id: 'R16-4', group: 'R16', matchday: 1, date: '2026-07-04', time: '22:00', homeTeam: 'W-R32-7', awayTeam: 'W-R32-8', homeCode: '', awayCode: '', venue: "Levi's Stadium", city: 'Santa Clara', round: 'round-16' },
  { id: 'R16-5', group: 'R16', matchday: 1, date: '2026-07-05', time: '16:00', homeTeam: 'W-R32-9', awayTeam: 'W-R32-10', homeCode: '', awayCode: '', venue: 'Mercedes-Benz Stadium', city: 'Atlanta', round: 'round-16' },
  { id: 'R16-6', group: 'R16', matchday: 1, date: '2026-07-05', time: '18:00', homeTeam: 'W-R32-11', awayTeam: 'W-R32-12', homeCode: '', awayCode: '', venue: 'SoFi Stadium', city: 'Los Angeles', round: 'round-16' },
  { id: 'R16-7', group: 'R16', matchday: 1, date: '2026-07-05', time: '20:00', homeTeam: 'W-R32-13', awayTeam: 'W-R32-14', homeCode: '', awayCode: '', venue: 'Gillette Stadium', city: 'Boston', round: 'round-16' },
  { id: 'R16-8', group: 'R16', matchday: 1, date: '2026-07-05', time: '22:00', homeTeam: 'W-R32-15', awayTeam: 'W-R32-16', homeCode: '', awayCode: '', venue: 'Hard Rock Stadium', city: 'Miami', round: 'round-16' },
];

// ═══════════════════════════════════════════════════════════════
// QUARTERFINALS (4 matches → 4 winners)
// ═══════════════════════════════════════════════════════════════

const QUARTERFINALS: Match[] = [
  { id: 'QF-1', group: 'QF', matchday: 1, date: '2026-07-09', time: '19:00', homeTeam: 'W-R16-1', awayTeam: 'W-R16-2', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'quarter' },
  { id: 'QF-2', group: 'QF', matchday: 1, date: '2026-07-09', time: '22:00', homeTeam: 'W-R16-3', awayTeam: 'W-R16-4', homeCode: '', awayCode: '', venue: "Levi's Stadium", city: 'Santa Clara', round: 'quarter' },
  { id: 'QF-3', group: 'QF', matchday: 1, date: '2026-07-10', time: '19:00', homeTeam: 'W-R16-5', awayTeam: 'W-R16-6', homeCode: '', awayCode: '', venue: 'NRG Stadium', city: 'Houston', round: 'quarter' },
  { id: 'QF-4', group: 'QF', matchday: 1, date: '2026-07-10', time: '22:00', homeTeam: 'W-R16-7', awayTeam: 'W-R16-8', homeCode: '', awayCode: '', venue: 'Hard Rock Stadium', city: 'Miami', round: 'quarter' },
];

// ═══════════════════════════════════════════════════════════════
// SEMIFINALS
// ═══════════════════════════════════════════════════════════════

const SEMIFINALS: Match[] = [
  { id: 'SF-1', group: 'SF', matchday: 1, date: '2026-07-14', time: '19:00', homeTeam: 'W-QF-1', awayTeam: 'W-QF-2', homeCode: '', awayCode: '', venue: 'AT&T Stadium', city: 'Dallas', round: 'semi' },
  { id: 'SF-2', group: 'SF', matchday: 1, date: '2026-07-15', time: '19:00', homeTeam: 'W-QF-3', awayTeam: 'W-QF-4', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'semi' },
];

// ═══════════════════════════════════════════════════════════════
// THIRD PLACE MATCH & FINAL
// ═══════════════════════════════════════════════════════════════

const THIRD_PLACE: Match[] = [
  { id: '3rd', group: 'Final', matchday: 1, date: '2026-07-18', time: '18:00', homeTeam: 'L-SF-1', awayTeam: 'L-SF-2', homeCode: '', awayCode: '', venue: 'Hard Rock Stadium', city: 'Miami', round: 'third' },
];

const FINAL: Match[] = [
  { id: 'Final', group: 'Final', matchday: 1, date: '2026-07-19', time: '17:00', homeTeam: 'W-SF-1', awayTeam: 'W-SF-2', homeCode: '', awayCode: '', venue: 'MetLife Stadium', city: 'New York', round: 'final' },
];

// ═══════════════════════════════════════════════════════════════
// ALL MATCHES
// ═══════════════════════════════════════════════════════════════

export const ALL_MATCHES: Match[] = [
  ...GROUP_A,
  ...GROUP_B,
  ...GROUP_C,
  ...GROUP_D,
  ...GROUP_E,
  ...GROUP_F,
  ...GROUP_G,
  ...GROUP_H,
  ...GROUP_I,
  ...GROUP_J,
  ...GROUP_K,
  ...GROUP_L,
  ...ROUND_OF_32,
  ...ROUND_OF_16,
  ...QUARTERFINALS,
  ...SEMIFINALS,
  ...THIRD_PLACE,
  ...FINAL,
];

// Group stage matches only (for match selector)
export const GROUP_STAGE_MATCHES: Match[] = ALL_MATCHES.filter(m => m.round === 'group');
export const KNOCKOUT_MATCHES: Match[] = ALL_MATCHES.filter(m => m.round !== 'group');

// Quick lookup
export const MATCHES_BY_GROUP: Record<string, Match[]> = {};
for (const letter of ['A','B','C','D','E','F','G','H','I','J','K','L']) {
  MATCHES_BY_GROUP[letter] = GROUP_STAGE_MATCHES.filter(m => m.group === letter);
}

// Legacy exports for compatibility
export type Round = 'group' | 'round-32' | 'round-16' | 'quarter' | 'semi' | 'third' | 'final';
export const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];
export const getMatchesByGroup = (g: string) => GROUP_STAGE_MATCHES.filter(m => m.group === g);
export const getMatchesByRound = (r: string) => ALL_MATCHES.filter(m => m.round === r);
export const getTeamFlag = (name: string): string => {
  const t = getTeamByName(name);
  return t?.flag || '❓';
};
export const formatMatchDate = (d: string | Match) => {
  const dateStr = typeof d === 'string' ? d : d.date;
  const dt = new Date(dateStr + 'T12:00:00');
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};
export const formatMatchTime = (t: string | Match) => {
  const timeStr = typeof t === 'string' ? t : t.time;
  return timeStr;
};
export const getRoundName = (round: string): string => {
  const names: Record<string, string> = {
    group: 'Fase de Grupos',
    'round-32': '1/16 Final',
    'round-16': 'Octavos',
    quarter: 'Cuartos',
    semi: 'Semis',
    third: '3° Puesto',
    final: 'Final',
  };
  return names[round] || round;
};
