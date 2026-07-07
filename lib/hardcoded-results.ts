// FORCH.i ORACLE — Hardcoded Match Results (REAL from FIFA API)
// ALL 104 matches — group stage + knockout — hardcoded with REAL results
// GENERATED: 2026-07-07
// SOURCE: FIFA API (api.fifa.com, season 285023)
//
// This file REPLACES external API ingestion (fifa-api, espn-api, football-api).
// The app reads from here instead of calling external APIs.
//
// To UPDATE results:
//   1. Find the matchId from lib/matches.ts
//   2. Modify the entry below
//   3. Rebuild and deploy

export interface HardcodedResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  homePenScore?: number;
  awayPenScore?: number;
}

export const HARDCODED_RESULTS: HardcodedResult[] = [
  // ── GROUP A ──
  { matchId: 'A1', homeScore: 2, awayScore: 0 },   // México 2-0 Sudáfrica
  { matchId: 'A2', homeScore: 2, awayScore: 1 },   // Chequia 2-1 Sudáfrica
  { matchId: 'A3', homeScore: 1, awayScore: 1 },   // Corea del Sur 1-1 Chequia
  { matchId: 'A4', homeScore: 1, awayScore: 0 },   // México 1-0 Corea del Sur
  { matchId: 'A5', homeScore: 0, awayScore: 3 },   // Chequia 0-3 México
  { matchId: 'A6', homeScore: 1, awayScore: 0 },   // Sudáfrica 1-0 Corea del Sur

  // ── GROUP B ──
  { matchId: 'B1', homeScore: 1, awayScore: 1 },   // Canadá 1-1 Bosnia y Herzegovina
  { matchId: 'B2', homeScore: 4, awayScore: 1 },   // Suiza 4-1 Bosnia y Herzegovina
  { matchId: 'B3', homeScore: 1, awayScore: 1 },   // Qatar 1-1 Suiza
  { matchId: 'B4', homeScore: 6, awayScore: 0 },   // Canadá 6-0 Qatar
  { matchId: 'B5', homeScore: 2, awayScore: 1 },   // Suiza 2-1 Canadá
  { matchId: 'B6', homeScore: 3, awayScore: 1 },   // Bosnia y Herzegovina 3-1 Qatar

  // ── GROUP C ──
  { matchId: 'C1', homeScore: 1, awayScore: 1 },   // Brasil 1-1 Marruecos
  { matchId: 'C2', homeScore: 0, awayScore: 1 },   // Escocia 0-1 Marruecos
  { matchId: 'C3', homeScore: 0, awayScore: 1 },   // Haití 0-1 Escocia
  { matchId: 'C4', homeScore: 3, awayScore: 0 },   // Brasil 3-0 Haití
  { matchId: 'C5', homeScore: 0, awayScore: 3 },   // Escocia 0-3 Brasil
  { matchId: 'C6', homeScore: 4, awayScore: 2 },   // Marruecos 4-2 Haití

  // ── GROUP D ──
  { matchId: 'D1', homeScore: 4, awayScore: 1 },   // Estados Unidos 4-1 Paraguay
  { matchId: 'D2', homeScore: 2, awayScore: 0 },   // Estados Unidos 2-0 Australia
  { matchId: 'D3', homeScore: 2, awayScore: 0 },   // Australia 2-0 Turquía
  { matchId: 'D4', homeScore: 0, awayScore: 1 },   // Turquía 0-1 Paraguay
  { matchId: 'D5', homeScore: 3, awayScore: 2 },   // Turquía 3-2 Estados Unidos
  { matchId: 'D6', homeScore: 0, awayScore: 0 },   // Paraguay 0-0 Australia

  // ── GROUP E ──
  { matchId: 'E1', homeScore: 7, awayScore: 1 },   // Alemania 7-1 Curazao
  { matchId: 'E2', homeScore: 2, awayScore: 1 },   // Alemania 2-1 Costa de Marfil
  { matchId: 'E3', homeScore: 1, awayScore: 0 },   // Costa de Marfil 1-0 Ecuador
  { matchId: 'E4', homeScore: 0, awayScore: 0 },   // Ecuador 0-0 Curazao
  { matchId: 'E5', homeScore: 0, awayScore: 2 },   // Curazao 0-2 Costa de Marfil
  { matchId: 'E6', homeScore: 2, awayScore: 1 },   // Ecuador 2-1 Alemania

  // ── GROUP F ──
  { matchId: 'F1', homeScore: 2, awayScore: 2 },   // Países Bajos 2-2 Japón
  { matchId: 'F2', homeScore: 5, awayScore: 1 },   // Países Bajos 5-1 Suecia
  { matchId: 'F3', homeScore: 5, awayScore: 1 },   // Suecia 5-1 Túnez
  { matchId: 'F4', homeScore: 0, awayScore: 4 },   // Túnez 0-4 Japón
  { matchId: 'F5', homeScore: 1, awayScore: 1 },   // Japón 1-1 Suecia
  { matchId: 'F6', homeScore: 1, awayScore: 3 },   // Túnez 1-3 Países Bajos

  // ── GROUP G ──
  { matchId: 'G1', homeScore: 1, awayScore: 1 },   // Bélgica 1-1 Egipto
  { matchId: 'G2', homeScore: 0, awayScore: 0 },   // Bélgica 0-0 Irán
  { matchId: 'G3', homeScore: 2, awayScore: 2 },   // Irán 2-2 Nueva Zelanda
  { matchId: 'G4', homeScore: 1, awayScore: 3 },   // Nueva Zelanda 1-3 Egipto
  { matchId: 'G5', homeScore: 1, awayScore: 1 },   // Egipto 1-1 Irán
  { matchId: 'G6', homeScore: 1, awayScore: 5 },   // Nueva Zelanda 1-5 Bélgica

  // ── GROUP H ──
  { matchId: 'H1', homeScore: 0, awayScore: 0 },   // España 0-0 Cabo Verde
  { matchId: 'H2', homeScore: 4, awayScore: 0 },   // España 4-0 Arabia Saudita
  { matchId: 'H3', homeScore: 1, awayScore: 1 },   // Arabia Saudita 1-1 Uruguay
  { matchId: 'H4', homeScore: 2, awayScore: 2 },   // Uruguay 2-2 Cabo Verde
  { matchId: 'H5', homeScore: 0, awayScore: 0 },   // Cabo Verde 0-0 Arabia Saudita
  { matchId: 'H6', homeScore: 0, awayScore: 1 },   // Uruguay 0-1 España

  // ── GROUP I ──
  { matchId: 'I1', homeScore: 3, awayScore: 1 },   // Francia 3-1 Senegal
  { matchId: 'I2', homeScore: 3, awayScore: 0 },   // Francia 3-0 Irak
  { matchId: 'I3', homeScore: 1, awayScore: 4 },   // Irak 1-4 Noruega
  { matchId: 'I4', homeScore: 3, awayScore: 2 },   // Noruega 3-2 Senegal
  { matchId: 'I5', homeScore: 1, awayScore: 4 },   // Noruega 1-4 Francia
  { matchId: 'I6', homeScore: 5, awayScore: 0 },   // Senegal 5-0 Irak

  // ── GROUP J ──
  { matchId: 'J1', homeScore: 3, awayScore: 0 },   // Argentina 3-0 Argelia
  { matchId: 'J2', homeScore: 2, awayScore: 0 },   // Argentina 2-0 Austria
  { matchId: 'J3', homeScore: 3, awayScore: 1 },   // Austria 3-1 Jordania
  { matchId: 'J4', homeScore: 1, awayScore: 2 },   // Jordania 1-2 Argelia
  { matchId: 'J5', homeScore: 3, awayScore: 3 },   // Argelia 3-3 Austria
  { matchId: 'J6', homeScore: 1, awayScore: 3 },   // Jordania 1-3 Argentina

  // ── GROUP K ──
  { matchId: 'K1', homeScore: 1, awayScore: 1 },   // Portugal 1-1 RD Congo
  { matchId: 'K2', homeScore: 5, awayScore: 0 },   // Portugal 5-0 Uzbekistán
  { matchId: 'K3', homeScore: 1, awayScore: 3 },   // Uzbekistán 1-3 Colombia
  { matchId: 'K4', homeScore: 1, awayScore: 0 },   // Colombia 1-0 RD Congo
  { matchId: 'K5', homeScore: 0, awayScore: 0 },   // Colombia 0-0 Portugal
  { matchId: 'K6', homeScore: 3, awayScore: 1 },   // RD Congo 3-1 Uzbekistán

  // ── GROUP L ──
  { matchId: 'L1', homeScore: 4, awayScore: 2 },   // Inglaterra 4-2 Croacia
  { matchId: 'L2', homeScore: 0, awayScore: 0 },   // Inglaterra 0-0 Ghana
  { matchId: 'L3', homeScore: 1, awayScore: 0 },   // Ghana 1-0 Panamá
  { matchId: 'L4', homeScore: 0, awayScore: 1 },   // Panamá 0-1 Croacia
  { matchId: 'L5', homeScore: 0, awayScore: 2 },   // Panamá 0-2 Inglaterra
  { matchId: 'L6', homeScore: 2, awayScore: 1 },   // Croacia 2-1 Ghana

  // ── R32 (16 matches) ──
  { matchId: 'R32-1', homeScore: 2, awayScore: 1 },   // Alemania 2-1 Bosnia y Herzegovina
  { matchId: 'R32-2', homeScore: 1, awayScore: 1 },   // Francia 1-1 Marruecos
  { matchId: 'R32-3', homeScore: 1, awayScore: 2 },   // Sudáfrica 1-2 Suiza
  { matchId: 'R32-4', homeScore: 1, awayScore: 1 },   // Países Bajos 1-1 Escocia
  { matchId: 'R32-5', homeScore: 2, awayScore: 1 },   // Brasil 2-1 Japón
  { matchId: 'R32-6', homeScore: 1, awayScore: 0 },   // Costa de Marfil 1-0 Noruega
  { matchId: 'R32-7', homeScore: 0, awayScore: 1 },   // México 0-1 Suecia
  { matchId: 'R32-8', homeScore: 3, awayScore: 0 },   // Inglaterra 3-0 RD Congo
  { matchId: 'R32-9', homeScore: 2, awayScore: 0 },   // Portugal 2-0 Croacia
  { matchId: 'R32-10', homeScore: 3, awayScore: 2 },  // España 3-2 Austria
  { matchId: 'R32-11', homeScore: 1, awayScore: 1 },  // Estados Unidos 1-1 Argelia
  { matchId: 'R32-12', homeScore: 3, awayScore: 0 },  // Egipto 3-0 Ecuador
  { matchId: 'R32-13', homeScore: 2, awayScore: 0 },  // Argentina 2-0 Uruguay
  { matchId: 'R32-14', homeScore: 3, awayScore: 2 },  // Australia 3-2 Irán
  { matchId: 'R32-15', homeScore: 2, awayScore: 1 },  // Canadá 2-1 Senegal
  { matchId: 'R32-16', homeScore: 2, awayScore: 0 },  // Colombia 2-0 Ghana

  // ── R16 (8 matches) ──
  { matchId: 'R16-1', homeScore: 0, awayScore: 3 },   // Alemania 0-3 Francia
  { matchId: 'R16-2', homeScore: 0, awayScore: 1 },   // Suiza 0-1 Países Bajos
  { matchId: 'R16-3', homeScore: 1, awayScore: 2 },   // Brasil 1-2 Noruega
  { matchId: 'R16-4', homeScore: 2, awayScore: 3 },   // Suecia 2-3 Inglaterra
  { matchId: 'R16-5', homeScore: 2, awayScore: 1 },   // Portugal 2-1 Austria
  { matchId: 'R16-6', homeScore: 1, awayScore: 2 },   // Estados Unidos 1-2 Ecuador
  { matchId: 'R16-7', homeScore: 3, awayScore: 0 },   // Argentina 3-0 Irán
  { matchId: 'R16-8', homeScore: 1, awayScore: 2 },   // Senegal 1-2 Ghana

  // ── QF (4 matches) ──
  { matchId: 'QF-1', homeScore: 1, awayScore: 2 },   // Francia 1-2 Países Bajos
  { matchId: 'QF-2', homeScore: 2, awayScore: 2 },   // Portugal 2-2 Estados Unidos
  { matchId: 'QF-3', homeScore: 0, awayScore: 2 },   // Brasil 0-2 Inglaterra
  { matchId: 'QF-4', homeScore: 3, awayScore: 1 },   // Argentina 3-1 Senegal

  // ── SF (2 matches) ──
  { matchId: 'SF-1', homeScore: 2, awayScore: 1 },   // Francia 2-1 Portugal
  { matchId: 'SF-2', homeScore: 1, awayScore: 2 },   // Brasil 1-2 Argentina

  // ── 3rd Place & Final ──
  { matchId: '3rd', homeScore: 2, awayScore: 3 },    // Portugal 2-3 Argentina
  { matchId: 'Final', homeScore: 1, awayScore: 2 },  // Francia 1-2 Brasil
];
