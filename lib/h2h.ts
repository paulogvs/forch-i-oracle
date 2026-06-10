// FORCH.i ORACLE — H2H Correlation Engine
// Computes historical head-to-head advantage between teams

export interface H2HRecord {
  totalMatches: number;
  teamAWins: number;
  draws: number;
  teamBWins: number;
  teamAGoals: number;
  teamBGoals: number;
  lastMeeting: string | null;
}

export interface H2HAdvantage {
  factor: number;
  psychologicalEdge: number;
  summary: string;
}

// Pre-computed H2H data
const H2H_DATABASE: Record<string, { wA: number; d: number; wB: number; gA: number; gB: number; lm?: string }> = {
  'Argentina_vs_Brasil': { wA: 28, d: 23, wB: 27, gA: 110, gB: 115, lm: '2024-11-15' },
  'Alemania_vs_Argentina': { wA: 13, d: 7, wB: 11, gA: 35, gB: 31, lm: '2022-12-03' },
  'Francia_vs_Argentina': { wA: 7, d: 5, wB: 10, gA: 28, gB: 34, lm: '2022-12-18' },
  'Brasil_vs_Francia': { wA: 18, d: 10, wB: 13, gA: 62, gB: 50, lm: '2022-12-09' },
  'España_vs_Alemania': { wA: 6, d: 4, wB: 9, gA: 20, gB: 25, lm: '2022-11-27' },
  'Inglaterra_vs_Alemania': { wA: 11, d: 5, wB: 14, gA: 35, gB: 40, lm: '2022-09-26' },
  'Portugal_vs_España': { wA: 8, d: 11, wB: 13, gA: 34, gB: 45, lm: '2022-11-17' },
  'Argentina_vs_Francia': { wA: 10, d: 5, wB: 7, gA: 34, gB: 28, lm: '2022-12-18' },
  'Brasil_vs_Alemania': { wA: 12, d: 6, wB: 9, gA: 38, gB: 32, lm: '2022-12-09' },
  'Países Bajos_vs_Argentina': { wA: 6, d: 5, wB: 8, gA: 22, gB: 25, lm: '2022-12-09' },
  'Marruecos_vs_España': { wA: 2, d: 3, wB: 5, gA: 8, gB: 15, lm: '2022-12-06' },
  'Croacia_vs_Brasil': { wA: 2, d: 2, wB: 3, gA: 7, gB: 10, lm: '2022-12-09' },
  'México_vs_Estados Unidos': { wA: 18, d: 15, wB: 14, gA: 55, gB: 50, lm: '2024-09-07' },
  'Inglaterra_vs_Francia': { wA: 10, d: 5, wB: 8, gA: 30, gB: 25, lm: '2022-12-10' },
  'Portugal_vs_Francia': { wA: 5, d: 8, wB: 12, gA: 20, gB: 32, lm: '2024-07-05' },
  'Argentina_vs_Croacia': { wA: 5, d: 2, wB: 1, gA: 14, gB: 7, lm: '2022-12-13' },
  'Brasil_vs_Croacia': { wA: 3, d: 2, wB: 2, gA: 10, gB: 7, lm: '2022-12-09' },
  'Argentina_vs_Países Bajos': { wA: 8, d: 5, wB: 6, gA: 25, gB: 22, lm: '2022-12-09' },
  'Francia_vs_Croacia': { wA: 5, d: 2, wB: 2, gA: 14, gB: 9, lm: '2022-12-18' },
  'España_vs_Marruecos': { wA: 5, d: 3, wB: 2, gA: 15, gB: 8, lm: '2022-12-06' },
  'Portugal_vs_Marruecos': { wA: 4, d: 2, wB: 1, gA: 10, gB: 5, lm: '2024-10-12' },
  'Japón_vs_España': { wA: 2, d: 2, wB: 4, gA: 8, gB: 14, lm: '2022-12-01' },
  'Corea del Sur_vs_Brasil': { wA: 1, d: 2, wB: 8, gA: 6, gB: 22, lm: '2022-12-05' },
  'Corea del Sur_vs_Portugal': { wA: 2, d: 2, wB: 3, gA: 8, gB: 10, lm: '2022-12-02' },
  'Uruguay_vs_Brasil': { wA: 12, d: 17, wB: 22, gA: 60, gB: 75, lm: '2024-10-15' },
  'Argentina_vs_Uruguay': { wA: 32, d: 18, wB: 12, gA: 95, gB: 60, lm: '2024-11-15' },
  'Colombia_vs_Argentina': { wA: 8, d: 12, wB: 17, gA: 35, gB: 50, lm: '2024-11-19' },
  'Colombia_vs_Brasil': { wA: 7, d: 12, wB: 14, gA: 32, gB: 45, lm: '2024-11-19' },
  'Senegal_vs_Francia': { wA: 1, d: 1, wB: 3, gA: 4, gB: 8, lm: '2022-11-25' },
  'Egipto_vs_Argentina': { wA: 1, d: 1, wB: 3, gA: 3, gB: 7, lm: '2018-03-27' },
  'Australia_vs_Argentina': { wA: 1, d: 1, wB: 5, gA: 5, gB: 15, lm: '2022-11-30' },
  'Polonia_vs_Argentina': { wA: 2, d: 3, wB: 5, gA: 10, gB: 18, lm: '2022-11-30' },
  'Arabia Saudita_vs_Argentina': { wA: 1, d: 1, wB: 3, gA: 4, gB: 8, lm: '2022-11-22' },
  'Túnez_vs_Francia': { wA: 0, d: 1, wB: 3, gA: 2, gB: 7, lm: '2022-11-30' },
  'Dinamarca_vs_Francia': { wA: 3, d: 4, wB: 6, gA: 12, gB: 18, lm: '2022-11-26' },
  'Irán_vs_Estados Unidos': { wA: 1, d: 1, wB: 1, gA: 3, gB: 3, lm: '2022-11-29' },
  'Ecuador_vs_Países Bajos': { wA: 1, d: 1, wB: 3, gA: 5, gB: 10, lm: '2022-11-29' },
  'Qatar_vs_Ecuador': { wA: 0, d: 1, wB: 2, gA: 2, gB: 5, lm: '2022-11-20' },
  'Inglaterra_vs_Estados Unidos': { wA: 5, d: 4, wB: 1, gA: 15, gB: 6, lm: '2022-11-29' },
  'Irán_vs_Inglaterra': { wA: 0, d: 1, wB: 2, gA: 2, gB: 8, lm: '2022-11-29' },
  'Gales_vs_Inglaterra': { wA: 2, d: 3, wB: 6, gA: 10, gB: 18, lm: '2022-11-29' },
  'Canadá_vs_Bélgica': { wA: 1, d: 1, wB: 3, gA: 5, gB: 10, lm: '2022-11-23' },
  'Marruecos_vs_Croacia': { wA: 1, d: 2, wB: 1, gA: 4, gB: 4, lm: '2022-11-23' },
  'Bélgica_vs_Croacia': { wA: 4, d: 2, wB: 2, gA: 12, gB: 8, lm: '2022-12-01' },
  'Japón_vs_Alemania': { wA: 2, d: 1, wB: 3, gA: 8, gB: 10, lm: '2022-11-23' },
  'Costa Rica_vs_España': { wA: 0, d: 0, wB: 3, gA: 2, gB: 15, lm: '2022-11-23' },
  'Costa Rica_vs_Japón': { wA: 2, d: 1, wB: 2, gA: 6, gB: 6, lm: '2022-12-01' },
  'Portugal_vs_Ghana': { wA: 3, d: 0, wB: 0, gA: 8, gB: 2, lm: '2022-11-24' },
  'Uruguay_vs_Corea del Sur': { wA: 4, d: 4, wB: 2, gA: 12, gB: 8, lm: '2022-11-24' },
  'Brasil_vs_Serbia': { wA: 2, d: 0, wB: 0, gA: 5, gB: 1, lm: '2022-11-24' },
  'Suiza_vs_Camerún': { wA: 2, d: 1, wB: 0, gA: 4, gB: 1, lm: '2022-11-24' },
  'Ghana_vs_Uruguay': { wA: 1, d: 1, wB: 2, gA: 5, gB: 7, lm: '2022-12-02' },
};

export function computeH2H(teamA: string, teamB: string, eloDiff: number = 0): H2HAdvantage {
  const keyA = `${teamA}_vs_${teamB}`;
  const keyB = `${teamB}_vs_${teamA}`;
  const record = H2H_DATABASE[keyA] || H2H_DATABASE[keyB];
  const isReversed = !H2H_DATABASE[keyA];

  if (record) {
    const total = record.wA + record.d + record.wB;
    if (total >= 3) {
      const winsA = isReversed ? record.wB : record.wA;
      const winsB = isReversed ? record.wA : record.wB;
      const goalsA = isReversed ? record.gB : record.gA;
      const goalsB = isReversed ? record.gA : record.gB;
      const draws = record.d;

      const winRateA = winsA / total;
      const winRateB = winsB / total;
      const psychologicalEdge = winRateA - winRateB;

      const gpgA = goalsA / Math.max(1, total - draws);
      const gpgB = goalsB / Math.max(1, total - draws);
      const factor = 1.0 + (gpgA - gpgB) * 0.1;
      const clampedFactor = Math.max(0.85, Math.min(1.15, factor));

      const dominance = winRateA > 0.6 ? 'dominante' : winRateA > 0.5 ? 'favorable' : winRateA < 0.4 ? 'desfavorable' : 'equilibrado';
      const summary = `${teamA} vs ${teamB}: ${total} partidos · ${winsA}V-${draws}E-${winsB}D · H2H ${dominance}`;

      return {
        factor: Math.round(clampedFactor * 100) / 100,
        psychologicalEdge: Math.round(psychologicalEdge * 100) / 100,
        summary,
      };
    }
  }

  // Fallback: Elo-based estimate
  const eloAdvantage = eloDiff / 1000;
  const factor = 1.0 + eloAdvantage * 0.15;
  const clampedFactor = Math.max(0.9, Math.min(1.1, factor));

  return {
    factor: Math.round(clampedFactor * 100) / 100,
    psychologicalEdge: Math.round(eloAdvantage * 100) / 100,
    summary: 'Sin historial significativo — ventaja por Elo',
  };
}

export function getH2HRecord(teamA: string, teamB: string): H2HRecord | null {
  const keyA = `${teamA}_vs_${teamB}`;
  const keyB = `${teamB}_vs_${teamA}`;
  const record = H2H_DATABASE[keyA] || H2H_DATABASE[keyB];
  if (!record) return null;

  const isReversed = !H2H_DATABASE[keyA];
  return {
    totalMatches: record.wA + record.d + record.wB,
    teamAWins: isReversed ? record.wB : record.wA,
    draws: record.d,
    teamBWins: isReversed ? record.wA : record.wB,
    teamAGoals: isReversed ? record.gB : record.gA,
    teamBGoals: isReversed ? record.gA : record.gB,
    lastMeeting: record.lm || null,
  };
}
