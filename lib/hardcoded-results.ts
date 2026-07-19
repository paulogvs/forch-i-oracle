// FORCH.i ORACLE — Hardcoded Match Results (REAL from FIFA API)
// UPDATED: 2026-07-12
// This is the SINGLE SOURCE OF TRUTH for finished matches.

export interface HardcodedResult {
  matchId: string;
  homeScore: number;
  awayScore: number;
  homePenScore?: number;
  awayPenScore?: number;
}

export const HARDCODED_RESULTS: HardcodedResult[] = [
  // ── GROUP A ──
  { matchId: 'A1', homeScore: 2, awayScore: 0 },   // México (1st)
  { matchId: 'A2', homeScore: 2, awayScore: 1 },
  { matchId: 'A3', homeScore: 1, awayScore: 1 },
  { matchId: 'A4', homeScore: 1, awayScore: 0 },
  { matchId: 'A5', homeScore: 0, awayScore: 3 },
  { matchId: 'A6', homeScore: 1, awayScore: 0 },

  // ── GROUP B ──
  { matchId: 'B1', homeScore: 1, awayScore: 1 },
  { matchId: 'B2', homeScore: 4, awayScore: 1 },
  { matchId: 'B3', homeScore: 1, awayScore: 1 },
  { matchId: 'B4', homeScore: 6, awayScore: 0 },
  { matchId: 'B5', homeScore: 2, awayScore: 1 },
  { matchId: 'B6', homeScore: 3, awayScore: 1 },

  // ── GROUP C ──
  { matchId: 'C1', homeScore: 1, awayScore: 1 },
  { matchId: 'C2', homeScore: 0, awayScore: 1 },   // Marruecos (2nd)
  { matchId: 'C3', homeScore: 0, awayScore: 1 },
  { matchId: 'C4', homeScore: 3, awayScore: 0 },   // Brasil (1st)
  { matchId: 'C5', homeScore: 0, awayScore: 3 },
  { matchId: 'C6', homeScore: 4, awayScore: 2 },

  // ── GROUP D ──
  { matchId: 'D1', homeScore: 4, awayScore: 1 },
  { matchId: 'D2', homeScore: 2, awayScore: 0 },
  { matchId: 'D3', homeScore: 2, awayScore: 0 },
  { matchId: 'D4', homeScore: 0, awayScore: 1 },
  { matchId: 'D5', homeScore: 3, awayScore: 2 },
  { matchId: 'D6', homeScore: 0, awayScore: 0 },

  // ── GROUP E ──
  { matchId: 'E1', homeScore: 7, awayScore: 1 },
  { matchId: 'E2', homeScore: 2, awayScore: 1 },
  { matchId: 'E3', homeScore: 1, awayScore: 0 },
  { matchId: 'E4', homeScore: 0, awayScore: 0 },
  { matchId: 'E5', homeScore: 0, awayScore: 2 },
  { matchId: 'E6', homeScore: 2, awayScore: 1 },

  // ── GROUP F ──
  { matchId: 'F1', homeScore: 2, awayScore: 2 },
  { matchId: 'F2', homeScore: 5, awayScore: 1 },
  { matchId: 'F3', homeScore: 5, awayScore: 1 },
  { matchId: 'F4', homeScore: 0, awayScore: 4 },
  { matchId: 'F5', homeScore: 1, awayScore: 1 },
  { matchId: 'F6', homeScore: 1, awayScore: 3 },

  // ── GROUP G ──
  { matchId: 'G1', homeScore: 1, awayScore: 1 },
  { matchId: 'G2', homeScore: 0, awayScore: 0 },
  { matchId: 'G3', homeScore: 2, awayScore: 2 },
  { matchId: 'G4', homeScore: 1, awayScore: 3 },
  { matchId: 'G5', homeScore: 1, awayScore: 1 },
  { matchId: 'G6', homeScore: 1, awayScore: 5 },   // Bélgica (1st)

  // ── GROUP H ──
  { matchId: 'H1', homeScore: 0, awayScore: 0 },
  { matchId: 'H2', homeScore: 4, awayScore: 0 },
  { matchId: 'H3', homeScore: 1, awayScore: 1 },
  { matchId: 'H4', homeScore: 2, awayScore: 2 },
  { matchId: 'H5', homeScore: 0, awayScore: 0 },
  { matchId: 'H6', homeScore: 0, awayScore: 1 },   // España (1st)

  // ── GROUP I ──
  { matchId: 'I1', homeScore: 3, awayScore: 1 },   // Francia (1st)
  { matchId: 'I2', homeScore: 3, awayScore: 0 },
  { matchId: 'I3', homeScore: 1, awayScore: 4 },
  { matchId: 'I4', homeScore: 3, awayScore: 2 },   // Noruega (2nd)
  { matchId: 'I5', homeScore: 1, awayScore: 4 },
  { matchId: 'I6', homeScore: 5, awayScore: 0 },

  // ── GROUP J ──
  { matchId: 'J1', homeScore: 3, awayScore: 0 },
  { matchId: 'J2', homeScore: 2, awayScore: 0 },
  { matchId: 'J3', homeScore: 3, awayScore: 1 },
  { matchId: 'J4', homeScore: 1, awayScore: 2 },
  { matchId: 'J5', homeScore: 3, awayScore: 3 },
  { matchId: 'J6', homeScore: 1, awayScore: 3 },

  // ── GROUP K ──
  { matchId: 'K1', homeScore: 1, awayScore: 1 },
  { matchId: 'K2', homeScore: 5, awayScore: 0 },
  { matchId: 'K3', homeScore: 1, awayScore: 3 },
  { matchId: 'K4', homeScore: 1, awayScore: 0 },
  { matchId: 'K5', homeScore: 0, awayScore: 0 },
  { matchId: 'K6', homeScore: 3, awayScore: 1 },

  // ── GROUP L ──
  { matchId: 'L1', homeScore: 4, awayScore: 2 },   // Inglaterra (1st)
  { matchId: 'L2', homeScore: 0, awayScore: 0 },
  { matchId: 'L3', homeScore: 1, awayScore: 0 },
  { matchId: 'L4', homeScore: 0, awayScore: 1 },
  { matchId: 'L5', homeScore: 0, awayScore: 2 },
  { matchId: 'L6', homeScore: 2, awayScore: 1 },

  // ── R32 (16 matches, todos con resultados reales verificados) ──
  // R32-1:  1E vs 3ABCDEF → Alemania vs Paraguay. Paraguay gagne 1-1 (4-3 pens)
  { matchId: 'R32-1', homeScore: 1, awayScore: 1, homePenScore: 3, awayPenScore: 4 },
  // R32-2:  1I vs 3CDFGH → Francia vs Suecia. Francia 3-0
  { matchId: 'R32-2', homeScore: 3, awayScore: 0 },
  // R32-3:  2A vs 2B → Sudáfrica vs Canadá. Canadá 1-0 (Away win)
  { matchId: 'R32-3', homeScore: 0, awayScore: 1 },
  // R32-4:  1F vs 2C → Países Bajos vs Marruecos. Maroc gana 1-1 (3-2 pens)
  { matchId: 'R32-4', homeScore: 1, awayScore: 1, homePenScore: 2, awayPenScore: 3 },
  // R32-5:  2K vs 2L → Portugal vs Croacia. Portugal 2-1
  { matchId: 'R32-5', homeScore: 2, awayScore: 1 },
  // R32-6:  1H vs 2J → España vs Austria. España 3-0
  { matchId: 'R32-6', homeScore: 3, awayScore: 0 },
  // R32-7:  1D vs 3BEFIJ → USA vs Bosnia. USA 2-0
  { matchId: 'R32-7', homeScore: 2, awayScore: 0 },
  // R32-8:  1G vs 3AEHIJ → Bélgica vs Senegal. Bélgica 3-2
  { matchId: 'R32-8', homeScore: 3, awayScore: 2 },
  // R32-9:  1C vs 2F → Brasil vs Japón. Brasil 2-1
  { matchId: 'R32-9', homeScore: 2, awayScore: 1 },
  // R32-10: 2E vs 2I → Costa de Marfil vs Noruega. Noruega 2-1 (Away win)
  { matchId: 'R32-10', homeScore: 1, awayScore: 2 },
  // R32-11: 1A vs 3CEFHI → México vs Ecuador. México 2-0
  { matchId: 'R32-11', homeScore: 2, awayScore: 0 },
  // R32-12: 1L vs 3EHIJK → Inglaterra vs RD Congo. Inglaterra 2-1
  { matchId: 'R32-12', homeScore: 2, awayScore: 1 },
  // R32-13: 1J vs 2H → Argentina vs Cabo Verde. Argentina 3-2
  { matchId: 'R32-13', homeScore: 3, awayScore: 2 },
  // R32-14: 2D vs 2G → Australia vs Egipto. Egipto gana 1-1 (4-2 pens)
  { matchId: 'R32-14', homeScore: 1, awayScore: 1, homePenScore: 2, awayPenScore: 4 },
  // R32-15: 1B vs 3EFGIJ → Suiza vs Argelia. Suiza 2-0
  { matchId: 'R32-15', homeScore: 2, awayScore: 0 },
  // R32-16: 1K vs 3DEIJL → Colombia vs Ghana. Colombia 2-1
  { matchId: 'R32-16', homeScore: 2, awayScore: 1 },

    // ── R16 (FIFA official bracket cascade — ALL 8 matches) ──
  // R16-1: W-R32-1(1E/3ABCDEF) vs W-R32-2(1I/3CDFGH) → Paraguay vs Francia. Francia 1-0 (Away)
  { matchId: 'R16-1', homeScore: 0, awayScore: 1 },
  // R16-2: W-R32-3(2A/2B) vs W-R32-4(1F/2C) → Canadá vs Marruecos. Marruecos 3-0 (Away)
  { matchId: 'R16-2', homeScore: 0, awayScore: 3 },
  // R16-3: W-R32-9(1C/2F) vs W-R32-10(2E/2I) → Brasil vs Noruega. Noruega 2-1 (Away)
  { matchId: 'R16-3', homeScore: 1, awayScore: 2 },
  // R16-4: W-R32-11(1A/3CEFHI) vs W-R32-12(1L/3EHIJK) → México vs Inglaterra. Inglaterra 3-2 (Away)
  { matchId: 'R16-4', homeScore: 2, awayScore: 3 },
  // R16-5: W-R32-5(2K/2L) vs W-R32-6(1H/2J) → Portugal vs España. España 1-0 (Away)
  { matchId: 'R16-5', homeScore: 0, awayScore: 1 },
  // R16-6: W-R32-7(1D/3BEFIJ) vs W-R32-8(1G/3AEHIJ) → USA vs Bélgica. Bélgica 4-1 (Away)
  { matchId: 'R16-6', homeScore: 1, awayScore: 4 },
  // R16-7: W-R32-13(1J/2H) vs W-R32-14(2D/2G) → Argentina vs Egipto. Argentina 3-2 (Home)
  { matchId: 'R16-7', homeScore: 3, awayScore: 2 },
  // R16-8: W-R32-15(1B/3EFGIJ) vs W-R32-16(1K/3DEIJL) → Suiza vs Colombia. Suiza 0-0 (4-3 pens). Home wins shootout
  { matchId: 'R16-8', homeScore: 0, awayScore: 0, homePenScore: 4, awayPenScore: 3 },

  // ── R8 (Ronda de 8) ──
  // R8-1: Francia vs Marruecos. Francia 2-0 (Home win) — 9 julio, Boston
  { matchId: 'R8-1', homeScore: 2, awayScore: 0 },
  // R8-2: España vs Bélgica. España 2-1 (Home win) — 10 julio, Los Ángeles
  { matchId: 'R8-2', homeScore: 2, awayScore: 1 },
  // R8-3: Noruega vs Inglaterra. Inglaterra 2-1 (Away win, AET) — 11 julio, Miami
  { matchId: 'R8-3', homeScore: 1, awayScore: 2 },
  // R8-4: Argentina vs Suiza. Argentina 3-1 (Home win, AET) — 11 julio, Kansas City
  { matchId: 'R8-4', homeScore: 3, awayScore: 1 },

  // ── SEMIFINALS ──
  // SF-1: Francia vs España. España 2-0 (Home win) — 14 julio, Dallas
  { matchId: 'SF-1', homeScore: 0, awayScore: 2 },
  // SF-2: Inglaterra vs Argentina. Argentina 2-1 (Away win) — 15 julio, New York
  { matchId: 'SF-2', homeScore: 1, awayScore: 2 },

  // ── THIRD PLACE ──
  // 3rd: Francia vs Inglaterra. Inglaterra 6-4 (Away win) — 18 julio, Miami
  { matchId: '3rd', homeScore: 4, awayScore: 6 },
];
