// FORCH.i ORACLE — FIFA World Cup 2026 Group Stage Matches
// 48 teams in 12 groups of 4 → 72 group stage matches

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
  isTBD?: boolean; // true when a team slot is not yet qualified
}

// Helper: create a TBD placeholder
function tbd(code: string): { name: string; code: string; isTBD: true } {
  return { name: code, code: 'TBD', isTBD: true };
}

// ─── GROUP A ───────────────────────────────────────────────────
// Teams: Mexico, Argentina, Morocco, New Zealand
// (Positions TBD for qualifiers — using known hosts + top seeds)
const GROUP_A: Match[] = [
  { id: 'A1',  group: 'A', matchday: 1, date: '2026-06-11', time: '02:00', homeTeam: 'Mexico',      awayTeam: 'TBD-A3', homeCode: 'MEX', awayCode: 'TBD', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: true },
  { id: 'A2',  group: 'A', matchday: 1, date: '2026-06-11', time: '23:00', homeTeam: 'Argentina',   awayTeam: 'TBD-A4', homeCode: 'ARG', awayCode: 'TBD', venue: 'MetLife Stadium',         city: 'New York',     isTBD: true },
  { id: 'A3',  group: 'A', matchday: 2, date: '2026-06-15', time: '18:00', homeTeam: 'TBD-A3',      awayTeam: 'Argentina',  homeCode: 'TBD', awayCode: 'ARG', venue: 'NRG Stadium',             city: 'Houston',      isTBD: true },
  { id: 'A4',  group: 'A', matchday: 2, date: '2026-06-16', time: '02:00', homeTeam: 'TBD-A4',      awayTeam: 'Mexico',     homeCode: 'TBD', awayCode: 'MEX', venue: 'AT&T Stadium',            city: 'Dallas',       isTBD: true },
  { id: 'A5',  group: 'A', matchday: 3, date: '2026-06-19', time: '22:00', homeTeam: 'Mexico',      awayTeam: 'Argentina',  homeCode: 'MEX', awayCode: 'ARG', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: false },
  { id: 'A6',  group: 'A', matchday: 3, date: '2026-06-19', time: '22:00', homeTeam: 'TBD-A4',      awayTeam: 'TBD-A3',    homeCode: 'TBD', awayCode: 'TBD', venue: 'Levi\'s Stadium',         city: 'San Francisco', isTBD: true },
];

// ─── GROUP B ───────────────────────────────────────────────────
// Teams: France, Brazil, USA, Senegal
const GROUP_B: Match[] = [
  { id: 'B1',  group: 'B', matchday: 1, date: '2026-06-11', time: '20:00', homeTeam: 'USA',         awayTeam: 'TBD-B3', homeCode: 'USA', awayCode: 'TBD', venue: 'SoFi Stadium',            city: 'Los Angeles',  isTBD: true },
  { id: 'B2',  group: 'B', matchday: 1, date: '2026-06-12', time: '01:00', homeTeam: 'Francia',     awayTeam: 'TBD-B4', homeCode: 'FRA', awayCode: 'TBD', venue: 'Lumen Field',             city: 'Seattle',      isTBD: true },
  { id: 'B3',  group: 'B', matchday: 2, date: '2026-06-15', time: '20:00', homeTeam: 'TBD-B3',      awayTeam: 'Francia',  homeCode: 'TBD', awayCode: 'FRA', venue: 'Mercedes-Benz Stadium',   city: 'Atlanta',      isTBD: true },
  { id: 'B4',  group: 'B', matchday: 2, date: '2026-06-16', time: '23:00', homeTeam: 'TBD-B4',      awayTeam: 'USA',      homeCode: 'TBD', awayCode: 'USA', venue: 'Lincoln Financial Field', city: 'Philadelphia', isTBD: true },
  { id: 'B5',  group: 'B', matchday: 3, date: '2026-06-20', time: '01:00', homeTeam: 'USA',         awayTeam: 'Francia',  homeCode: 'USA', awayCode: 'FRA', venue: 'MetLife Stadium',         city: 'New York',     isTBD: false },
  { id: 'B6',  group: 'B', matchday: 3, date: '2026-06-20', time: '01:00', homeTeam: 'TBD-B4',      awayTeam: 'TBD-B3',  homeCode: 'TBD', awayCode: 'TBD', venue: 'Arrowhead Stadium',       city: 'Kansas City',  isTBD: true },
];

// ─── GROUP C ───────────────────────────────────────────────────
// Teams: England, Colombia, Canada, Ukraine
const GROUP_C: Match[] = [
  { id: 'C1',  group: 'C', matchday: 1, date: '2026-06-12', time: '18:00', homeTeam: 'Canadá',      awayTeam: 'TBD-C3', homeCode: 'CAN', awayCode: 'TBD', venue: 'BC Place',                city: 'Vancouver',    isTBD: true },
  { id: 'C2',  group: 'C', matchday: 1, date: '2026-06-12', time: '23:00', homeTeam: 'Inglaterra',  awayTeam: 'TBD-C4', homeCode: 'ENG', awayCode: 'TBD', venue: 'Hard Rock Stadium',       city: 'Miami',        isTBD: true },
  { id: 'C3',  group: 'C', matchday: 2, date: '2026-06-16', time: '18:00', homeTeam: 'TBD-C3',      awayTeam: 'Inglaterra', homeCode: 'TBD', awayCode: 'ENG', venue: 'Gillette Stadium',       city: 'Boston',       isTBD: true },
  { id: 'C4',  group: 'C', matchday: 2, date: '2026-06-17', time: '01:00', homeTeam: 'TBD-C4',      awayTeam: 'Canadá',   homeCode: 'TBD', awayCode: 'CAN', venue: 'BMO Field',               city: 'Toronto',      isTBD: true },
  { id: 'C5',  group: 'C', matchday: 3, date: '2026-06-20', time: '23:00', homeTeam: 'Canadá',      awayTeam: 'Inglaterra', homeCode: 'CAN', awayCode: 'ENG', venue: 'BC Place',                city: 'Vancouver',    isTBD: false },
  { id: 'C6',  group: 'C', matchday: 3, date: '2026-06-20', time: '23:00', homeTeam: 'TBD-C4',      awayTeam: 'TBD-C3', homeCode: 'TBD', awayCode: 'TBD', venue: 'NRG Stadium',             city: 'Houston',      isTBD: true },
];

// ─── GROUP D ───────────────────────────────────────────────────
// Teams: Spain, Uruguay, Costa Rica, Cameroon
const GROUP_D: Match[] = [
  { id: 'D1',  group: 'D', matchday: 1, date: '2026-06-12', time: '21:00', homeTeam: 'TBD-D3',      awayTeam: 'TBD-D4', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio BBVA',            city: 'Monterrey',    isTBD: true },
  { id: 'D2',  group: 'D', matchday: 1, date: '2026-06-13', time: '02:00', homeTeam: 'España',      awayTeam: 'Uruguay', homeCode: 'ESP', awayCode: 'URU', venue: 'MetLife Stadium',         city: 'New York',     isTBD: false },
  { id: 'D3',  group: 'D', matchday: 2, date: '2026-06-16', time: '21:00', homeTeam: 'Uruguay',     awayTeam: 'TBD-D3', homeCode: 'URU', awayCode: 'TBD', venue: 'Arrowhead Stadium',       city: 'Kansas City',  isTBD: true },
  { id: 'D4',  group: 'D', matchday: 2, date: '2026-06-17', time: '01:00', homeTeam: 'TBD-D4',      awayTeam: 'España',  homeCode: 'TBD', awayCode: 'ESP', venue: 'SoFi Stadium',            city: 'Los Angeles',  isTBD: true },
  { id: 'D5',  group: 'D', matchday: 3, date: '2026-06-21', time: '01:00', homeTeam: 'España',      awayTeam: 'TBD-D3', homeCode: 'ESP', awayCode: 'TBD', venue: 'Lincoln Financial Field', city: 'Philadelphia', isTBD: true },
  { id: 'D6',  group: 'D', matchday: 3, date: '2026-06-21', time: '01:00', homeTeam: 'TBD-D4',      awayTeam: 'Uruguay', homeCode: 'TBD', awayCode: 'URU', venue: 'AT&T Stadium',            city: 'Dallas',       isTBD: true },
];

// ─── GROUP E ───────────────────────────────────────────────────
// Teams: Belgium, Ecuador, Ghana, Jamaica
const GROUP_E: Match[] = [
  { id: 'E1',  group: 'E', matchday: 1, date: '2026-06-13', time: '17:00', homeTeam: 'TBD-E4',      awayTeam: 'TBD-E3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio Akron',           city: 'Guadalajara',  isTBD: true },
  { id: 'E2',  group: 'E', matchday: 1, date: '2026-06-13', time: '22:00', homeTeam: 'Bélgica',     awayTeam: 'Ecuador', homeCode: 'BEL', awayCode: 'ECU', venue: 'NRG Stadium',             city: 'Houston',      isTBD: false },
  { id: 'E3',  group: 'E', matchday: 2, date: '2026-06-17', time: '17:00', homeTeam: 'Ecuador',     awayTeam: 'TBD-E4', homeCode: 'ECU', awayCode: 'TBD', venue: 'Lumen Field',             city: 'Seattle',      isTBD: true },
  { id: 'E4',  group: 'E', matchday: 2, date: '2026-06-17', time: '23:00', homeTeam: 'TBD-E3',      awayTeam: 'Bélgica', homeCode: 'TBD', awayCode: 'BEL', venue: 'Mercedes-Benz Stadium',   city: 'Atlanta',      isTBD: true },
  { id: 'E5',  group: 'E', matchday: 3, date: '2026-06-21', time: '23:00', homeTeam: 'Bélgica',     awayTeam: 'TBD-E4', homeCode: 'BEL', awayCode: 'TBD', venue: 'Hard Rock Stadium',       city: 'Miami',        isTBD: true },
  { id: 'E6',  group: 'E', matchday: 3, date: '2026-06-21', time: '23:00', homeTeam: 'TBD-E3',      awayTeam: 'Ecuador', homeCode: 'TBD', awayCode: 'ECU', venue: 'Levi\'s Stadium',         city: 'San Francisco', isTBD: true },
];

// ─── GROUP F ───────────────────────────────────────────────────
// Teams: Netherlands, Paraguay, Qatar, Hungary
const GROUP_F: Match[] = [
  { id: 'F1',  group: 'F', matchday: 1, date: '2026-06-13', time: '20:00', homeTeam: 'TBD-F4',      awayTeam: 'TBD-F3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: true },
  { id: 'F2',  group: 'F', matchday: 1, date: '2026-06-14', time: '01:00', homeTeam: 'Países Bajos', awayTeam: 'Paraguay', homeCode: 'NED', awayCode: 'PAR', venue: 'Gillette Stadium',       city: 'Boston',       isTBD: false },
  { id: 'F3',  group: 'F', matchday: 2, date: '2026-06-17', time: '20:00', homeTeam: 'Paraguay',    awayTeam: 'TBD-F4', homeCode: 'PAR', awayCode: 'TBD', venue: 'BMO Field',               city: 'Toronto',      isTBD: true },
  { id: 'F4',  group: 'F', matchday: 2, date: '2026-06-18', time: '01:00', homeTeam: 'TBD-F3',      awayTeam: 'Países Bajos', homeCode: 'TBD', awayCode: 'NED', venue: 'AT&T Stadium',            city: 'Dallas',       isTBD: true },
  { id: 'F5',  group: 'F', matchday: 3, date: '2026-06-22', time: '01:00', homeTeam: 'Países Bajos', awayTeam: 'TBD-F4', homeCode: 'NED', awayCode: 'TBD', venue: 'MetLife Stadium',         city: 'New York',     isTBD: true },
  { id: 'F6',  group: 'F', matchday: 3, date: '2026-06-22', time: '01:00', homeTeam: 'TBD-F3',      awayTeam: 'Paraguay', homeCode: 'TBD', awayCode: 'PAR', venue: 'Estadio BBVA',            city: 'Monterrey',    isTBD: true },
];

// ─── GROUP G ───────────────────────────────────────────────────
// Teams: Portugal, Algeria, Iraq, Republic TBD (UAE winner)
const GROUP_G: Match[] = [
  { id: 'G1',  group: 'G', matchday: 1, date: '2026-06-14', time: '17:00', homeTeam: 'TBD-G4',      awayTeam: 'TBD-G3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio Akron',           city: 'Guadalajara',  isTBD: true },
  { id: 'G2',  group: 'G', matchday: 1, date: '2026-06-14', time: '23:00', homeTeam: 'Portugal',    awayTeam: 'Argelia', homeCode: 'POR', awayCode: 'ALG', venue: 'Lincoln Financial Field', city: 'Philadelphia', isTBD: false },
  { id: 'G3',  group: 'G', matchday: 2, date: '2026-06-18', time: '17:00', homeTeam: 'Argelia',     awayTeam: 'TBD-G4', homeCode: 'ALG', awayCode: 'TBD', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: true },
  { id: 'G4',  group: 'G', matchday: 2, date: '2026-06-18', time: '23:00', homeTeam: 'TBD-G3',      awayTeam: 'Portugal', homeCode: 'TBD', awayCode: 'POR', venue: 'Hard Rock Stadium',       city: 'Miami',        isTBD: true },
  { id: 'G5',  group: 'G', matchday: 3, date: '2026-06-22', time: '23:00', homeTeam: 'Portugal',    awayTeam: 'TBD-G4', homeCode: 'POR', awayCode: 'TBD', venue: 'BC Place',                city: 'Vancouver',    isTBD: true },
  { id: 'G6',  group: 'G', matchday: 3, date: '2026-06-22', time: '23:00', homeTeam: 'TBD-G3',      awayTeam: 'Argelia', homeCode: 'TBD', awayCode: 'ALG', venue: 'Levi\'s Stadium',         city: 'San Francisco', isTBD: true },
];

// ─── GROUP H ───────────────────────────────────────────────────
// Teams: Italy, Costa de Marfil, Uzbekistan, TBD (AFC playoff)
const GROUP_H: Match[] = [
  { id: 'H1',  group: 'H', matchday: 1, date: '2026-06-14', time: '20:00', homeTeam: 'TBD-H4',      awayTeam: 'TBD-H3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Arrowhead Stadium',       city: 'Kansas City',  isTBD: true },
  { id: 'H2',  group: 'H', matchday: 1, date: '2026-06-15', time: '01:00', homeTeam: 'Italia',      awayTeam: 'Costa de Marfil', homeCode: 'ITA', awayCode: 'CIV', venue: 'Lumen Field',             city: 'Seattle',      isTBD: false },
  { id: 'H3',  group: 'H', matchday: 2, date: '2026-06-18', time: '20:00', homeTeam: 'Costa de Marfil', awayTeam: 'TBD-H4', homeCode: 'CIV', awayCode: 'TBD', venue: 'Mercedes-Benz Stadium',   city: 'Atlanta',      isTBD: true },
  { id: 'H4',  group: 'H', matchday: 2, date: '2026-06-19', time: '01:00', homeTeam: 'TBD-H3',      awayTeam: 'Italia',  homeCode: 'TBD', awayCode: 'ITA', venue: 'NRG Stadium',             city: 'Houston',      isTBD: true },
  { id: 'H5',  group: 'H', matchday: 3, date: '2026-06-23', time: '01:00', homeTeam: 'Italia',      awayTeam: 'TBD-H4', homeCode: 'ITA', awayCode: 'TBD', venue: 'MetLife Stadium',         city: 'New York',     isTBD: true },
  { id: 'H6',  group: 'H', matchday: 3, date: '2026-06-23', time: '01:00', homeTeam: 'TBD-H3',      awayTeam: 'Costa de Marfil', homeCode: 'TBD', awayCode: 'CIV', venue: 'Estadio BBVA',            city: 'Monterrey',    isTBD: true },
];

// ─── GROUP I ───────────────────────────────────────────────────
// Teams: Croatia, Tunisia, Panama, TBD (Intercontinental playoff)
const GROUP_I: Match[] = [
  { id: 'I1',  group: 'I', matchday: 1, date: '2026-06-15', time: '17:00', homeTeam: 'TBD-I4',      awayTeam: 'TBD-I3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: true },
  { id: 'I2',  group: 'I', matchday: 1, date: '2026-06-15', time: '22:00', homeTeam: 'Croacia',     awayTeam: 'Túnez',  homeCode: 'CRO', awayCode: 'TUN', venue: 'SoFi Stadium',            city: 'Los Angeles',  isTBD: false },
  { id: 'I3',  group: 'I', matchday: 2, date: '2026-06-19', time: '17:00', homeTeam: 'Túnez',       awayTeam: 'TBD-I4', homeCode: 'TUN', awayCode: 'TBD', venue: 'Gillette Stadium',        city: 'Boston',       isTBD: true },
  { id: 'I4',  group: 'I', matchday: 2, date: '2026-06-19', time: '22:00', homeTeam: 'TBD-I3',      awayTeam: 'Croacia', homeCode: 'TBD', awayCode: 'CRO', venue: 'BMO Field',               city: 'Toronto',      isTBD: true },
  { id: 'I5',  group: 'I', matchday: 3, date: '2026-06-23', time: '22:00', homeTeam: 'Croacia',     awayTeam: 'TBD-I4', homeCode: 'CRO', awayCode: 'TBD', venue: 'AT&T Stadium',            city: 'Dallas',       isTBD: true },
  { id: 'I6',  group: 'I', matchday: 3, date: '2026-06-23', time: '22:00', homeTeam: 'TBD-I3',      awayTeam: 'Túnez',  homeCode: 'TBD', awayCode: 'TUN', venue: 'Hard Rock Stadium',       city: 'Miami',        isTBD: true },
];

// ─── GROUP J ───────────────────────────────────────────────────
// Teams: Denmark, Nigeria, Jamaica, TBD (CAF playoff)
const GROUP_J: Match[] = [
  { id: 'J1',  group: 'J', matchday: 1, date: '2026-06-15', time: '20:00', homeTeam: 'TBD-J4',      awayTeam: 'TBD-J3', homeCode: 'TBD', awayCode: 'TBD', venue: 'NRG Stadium',             city: 'Houston',      isTBD: true },
  { id: 'J2',  group: 'J', matchday: 1, date: '2026-06-16', time: '01:00', homeTeam: 'Dinamarca',   awayTeam: 'Nigeria', homeCode: 'DEN', awayCode: 'NGA', venue: 'Lincoln Financial Field', city: 'Philadelphia', isTBD: false },
  { id: 'J3',  group: 'J', matchday: 2, date: '2026-06-19', time: '20:00', homeTeam: 'Nigeria',     awayTeam: 'TBD-J4', homeCode: 'NGA', awayCode: 'TBD', venue: 'Estadio Akron',           city: 'Guadalajara',  isTBD: true },
  { id: 'J4',  group: 'J', matchday: 2, date: '2026-06-20', time: '01:00', homeTeam: 'TBD-J3',      awayTeam: 'Dinamarca', homeCode: 'TBD', awayCode: 'DEN', venue: 'BC Place',                city: 'Vancouver',    isTBD: true },
  { id: 'J5',  group: 'J', matchday: 3, date: '2026-06-24', time: '01:00', homeTeam: 'Dinamarca',   awayTeam: 'TBD-J4', homeCode: 'DEN', awayCode: 'TBD', venue: 'Lumen Field',             city: 'Seattle',      isTBD: true },
  { id: 'J6',  group: 'J', matchday: 3, date: '2026-06-24', time: '01:00', homeTeam: 'TBD-J3',      awayTeam: 'Nigeria', homeCode: 'TBD', awayCode: 'NGA', venue: 'Levi\'s Stadium',         city: 'San Francisco', isTBD: true },
];

// ─── GROUP K ───────────────────────────────────────────────────
// Teams: Switzerland, Senegal, TBD (OFC qualifier), TBD (AFC playoff)
const GROUP_K: Match[] = [
  { id: 'K1',  group: 'K', matchday: 1, date: '2026-06-16', time: '17:00', homeTeam: 'TBD-K4',      awayTeam: 'TBD-K3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio BBVA',            city: 'Monterrey',    isTBD: true },
  { id: 'K2',  group: 'K', matchday: 1, date: '2026-06-16', time: '22:00', homeTeam: 'Suiza',       awayTeam: 'Senegal', homeCode: 'SUI', awayCode: 'SEN', venue: 'Arrowhead Stadium',       city: 'Kansas City',  isTBD: false },
  { id: 'K3',  group: 'K', matchday: 2, date: '2026-06-20', time: '17:00', homeTeam: 'Senegal',     awayTeam: 'TBD-K4', homeCode: 'SEN', awayCode: 'TBD', venue: 'Estadio Azteca',          city: 'Mexico City',  isTBD: true },
  { id: 'K4',  group: 'K', matchday: 2, date: '2026-06-20', time: '22:00', homeTeam: 'TBD-K3',      awayTeam: 'Suiza',  homeCode: 'TBD', awayCode: 'SUI', venue: 'MetLife Stadium',         city: 'New York',     isTBD: true },
  { id: 'K5',  group: 'K', matchday: 3, date: '2026-06-24', time: '22:00', homeTeam: 'Suiza',       awayTeam: 'TBD-K4', homeCode: 'SUI', awayCode: 'TBD', venue: 'Mercedes-Benz Stadium',   city: 'Atlanta',      isTBD: true },
  { id: 'K6',  group: 'K', matchday: 3, date: '2026-06-24', time: '22:00', homeTeam: 'TBD-K3',      awayTeam: 'Senegal', homeCode: 'TBD', awayCode: 'SEN', venue: 'Hard Rock Stadium',       city: 'Miami',        isTBD: true },
];

// ─── GROUP L ───────────────────────────────────────────────────
// Teams: Austria, TBD (CAF playoff 2), TBD (AFC playoff 2), TBD (Intercontinental)
const GROUP_L: Match[] = [
  { id: 'L1',  group: 'L', matchday: 1, date: '2026-06-16', time: '20:00', homeTeam: 'TBD-L4',      awayTeam: 'TBD-L3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Gillette Stadium',        city: 'Boston',       isTBD: true },
  { id: 'L2',  group: 'L', matchday: 1, date: '2026-06-17', time: '01:00', homeTeam: 'Austria',     awayTeam: 'TBD-L4', homeCode: 'AUT', awayCode: 'TBD', venue: 'SoFi Stadium',            city: 'Los Angeles',  isTBD: true },
  { id: 'L3',  group: 'L', matchday: 2, date: '2026-06-20', time: '20:00', homeTeam: 'TBD-L4',      awayTeam: 'TBD-L3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Estadio Akron',           city: 'Guadalajara',  isTBD: true },
  { id: 'L4',  group: 'L', matchday: 2, date: '2026-06-21', time: '01:00', homeTeam: 'TBD-L3',      awayTeam: 'Austria', homeCode: 'TBD', awayCode: 'AUT', venue: 'BC Place',                city: 'Vancouver',    isTBD: true },
  { id: 'L5',  group: 'L', matchday: 3, date: '2026-06-24', time: '23:00', homeTeam: 'Austria',     awayTeam: 'TBD-L3', homeCode: 'AUT', awayCode: 'TBD', venue: 'Lumen Field',             city: 'Seattle',      isTBD: true },
  { id: 'L6',  group: 'L', matchday: 3, date: '2026-06-24', time: '23:00', homeTeam: 'TBD-L4',      awayTeam: 'TBD-L3', homeCode: 'TBD', awayCode: 'TBD', venue: 'Levi\'s Stadium',         city: 'San Francisco', isTBD: true },
];

// ─── ALL MATCHES ───────────────────────────────────────────────
export const matches: Match[] = [
  ...GROUP_A, ...GROUP_B, ...GROUP_C, ...GROUP_D,
  ...GROUP_E, ...GROUP_F, ...GROUP_G, ...GROUP_H,
  ...GROUP_I, ...GROUP_J, ...GROUP_K, ...GROUP_L,
];

// ─── HELPERS ───────────────────────────────────────────────────
export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

export type GroupId = typeof GROUPS[number];

/** Get all matches for a given group */
export function getMatchesByGroup(group: string): Match[] {
  return matches.filter((m) => m.group === group);
}

/** Get a match by its ID (e.g. 'A1', 'B5') */
export function getMatchById(id: string): Match | undefined {
  return matches.find((m) => m.id === id);
}

/** Get all non-TBD matches (confirmed fixtures only) */
export function getConfirmedMatches(): Match[] {
  return matches.filter((m) => !m.isTBD);
}

/** Format a match for display */
export function formatMatchDate(match: Match): string {
  const date = new Date(`${match.date}T${match.time}:00Z`);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatMatchTime(match: Match): string {
  return `${match.time} UTC`;
}

/** Get country flag emoji from team name using teams.ts data */
import { getTeamByName } from './teams';

export function getTeamFlag(teamName: string): string {
  const team = getTeamByName(teamName);
  return team?.flag || '🏳️';
}
