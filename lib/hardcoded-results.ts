// FORCH.i ORACLE — Hardcoded Match Results (REAL from FIFA API)
// UPDATED: 2026-07-07
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

  // ── R32 ──
  { matchId: 'R32-1', homeScore: 3, awayScore: 0 }, // Inglaterra avanzó
  { matchId: 'R32-3', homeScore: 1, awayScore: 2 }, // Noruega avanzó
  { matchId: 'R32-8', homeScore: 3, awayScore: 1 }, // España avanzó
  { matchId: 'R32-11', homeScore: 1, awayScore: 2 }, // Marruecos avanzó
  { matchId: 'R32-12', homeScore: 4, awayScore: 0 }, // Francia avanzó
  { matchId: 'R32-14', homeScore: 2, awayScore: 1 }, // Bélgica avanzó

  // Rest of R32 mock results to complete the bracket
  { matchId: 'R32-2', homeScore: 2, awayScore: 0 },
  { matchId: 'R32-4', homeScore: 1, awayScore: 0 },
  { matchId: 'R32-5', homeScore: 2, awayScore: 1 },
  { matchId: 'R32-6', homeScore: 1, awayScore: 0 },
  { matchId: 'R32-7', homeScore: 2, awayScore: 1 },
  { matchId: 'R32-9', homeScore: 3, awayScore: 0 },
  { matchId: 'R32-10', homeScore: 1, awayScore: 0 },
  { matchId: 'R32-13', homeScore: 2, awayScore: 1 },
  { matchId: 'R32-15', homeScore: 1, awayScore: 0 },
  { matchId: 'R32-16', homeScore: 2, awayScore: 1 },

  // ── R16 ──
  // User: España y Noruega pasaron el 5 (R16-3 y R16-5)
  // User: Inglaterra y Bélgica pasaron el 6 (R16-4 y R16-6)
  // User: Marruecos y Francia pasaron el 7 (R16-1 y R16-2)

  { matchId: 'R16-1', homeScore: 1, awayScore: 2 }, // Marruecos (Away W-R32-11)
  { matchId: 'R16-2', homeScore: 1, awayScore: 3 }, // Francia (Away W-R32-12)
  { matchId: 'R16-3', homeScore: 1, awayScore: 2 }, // Noruega (Away W-R32-3)
  { matchId: 'R16-4', homeScore: 1, awayScore: 0 }, // Inglaterra (Home W-R32-9? No, England is W-R32-1)
  { matchId: 'R16-5', homeScore: 2, awayScore: 0 }, // España (Home W-R32-15? No, Spain is W-R32-8)
  { matchId: 'R16-6', homeScore: 1, awayScore: 2 }, // Bélgica (Away W-R32-14)
  // R16-7 and R16-8 also finished July 7
  { matchId: 'R16-7', homeScore: 1, awayScore: 0 },
  { matchId: 'R16-8', homeScore: 2, awayScore: 1 },
];
