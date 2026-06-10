// FORCH.i ORACLE — WC2026 Venue Altitude Database
// Altitude effects on performance (FIFA research + scientific studies)
//
// Key principle: Teams not acclimated to altitude suffer:
// - VO2 max decreases ~7% per 1000m above 500m
// - Sprint recovery time increases
// - Passing accuracy decreases at very high altitude
//
// Source: FIFA Medical, "Football at Altitude" (2010-2024)

export interface Venue {
  name: string;
  city: string;
  altitudeM: number; // meters above sea level
  altitudeCategory: 'sea-level' | 'moderate' | 'high' | 'very-high';
}

export const WC2026_VENUES: Record<string, Venue> = {
  // ═══ MEXICO ═══
  'Estadio Azteca': {
    name: 'Estadio Azteca',
    city: 'Mexico City',
    altitudeM: 2200,
    altitudeCategory: 'high',
  },
  'Estadio Akron': {
    name: 'Estadio Akron',
    city: 'Guadalajara',
    altitudeM: 1560,
    altitudeCategory: 'moderate',
  },
  'Estadio BBVA': {
    name: 'Estadio BBVA',
    city: 'Monterrey',
    altitudeM: 540,
    altitudeCategory: 'moderate',
  },

  // ═══ USA — Sea Level / Low Altitude ═══
  "Levi's Stadium": {
    name: "Levi's Stadium",
    city: 'Santa Clara',
    altitudeM: 15,
    altitudeCategory: 'sea-level',
  },
  'SoFi Stadium': {
    name: 'SoFi Stadium',
    city: 'Los Angeles',
    altitudeM: 35,
    altitudeCategory: 'sea-level',
  },
  'Hard Rock Stadium': {
    name: 'Hard Rock Stadium',
    city: 'Miami',
    altitudeM: 3,
    altitudeCategory: 'sea-level',
  },
  'MetLife Stadium': {
    name: 'MetLife Stadium',
    city: 'New York',
    altitudeM: 5,
    altitudeCategory: 'sea-level',
  },
  'AT&T Stadium': {
    name: 'AT&T Stadium',
    city: 'Dallas',
    altitudeM: 190,
    altitudeCategory: 'sea-level',
  },
  'NRG Stadium': {
    name: 'NRG Stadium',
    city: 'Houston',
    altitudeM: 15,
    altitudeCategory: 'sea-level',
  },
  'Lumen Field': {
    name: 'Lumen Field',
    city: 'Seattle',
    altitudeM: 5,
    altitudeCategory: 'sea-level',
  },
  'Lincoln Financial Field': {
    name: 'Lincoln Financial Field',
    city: 'Philadelphia',
    altitudeM: 12,
    altitudeCategory: 'sea-level',
  },
  'Mercedes-Benz Stadium': {
    name: 'Mercedes-Benz Stadium',
    city: 'Atlanta',
    altitudeM: 320,
    altitudeCategory: 'sea-level',
  },
  'Arrowhead Stadium': {
    name: 'Arrowhead Stadium',
    city: 'Kansas City',
    altitudeM: 230,
    altitudeCategory: 'sea-level',
  },
  'Gillette Stadium': {
    name: 'Gillette Stadium',
    city: 'Boston',
    altitudeM: 5,
    altitudeCategory: 'sea-level',
  },
  'BMO Field': {
    name: 'BMO Field',
    city: 'Toronto',
    altitudeM: 76,
    altitudeCategory: 'sea-level',
  },
  'BC Place': {
    name: 'BC Place',
    city: 'Vancouver',
    altitudeM: 10,
    altitudeCategory: 'sea-level',
  },
};

/**
 * Get altitude adjustment factor for a team playing at a venue.
 * Returns a multiplier for goals scored:
 *   > 1.0 for teams acclimated to this altitude
 *   < 1.0 for teams NOT acclimated (reduced performance)
 *
 * Acclimation rules:
 * - Sea level teams at high altitude: -15% to -25%
 * - Moderate altitude teams at very high: -10%
 * - Same-altitude teams: no penalty, slight bonus for familiarity
 *
 * CONCACAF teams are partially acclimated to Mexico altitude.
 * South American teams from La Paz/Quito/Bogotá are acclimated.
 */
export function getAltitudeFactor(teamName: string, venueName: string): number {
  const venue = WC2026_VENUES[venueName];
  if (!venue) return 1.0;

  // Sea level venues: no effect
  if (venue.altitudeCategory === 'sea-level') return 1.0;

  // Teams acclimated to altitude
  const altitudeAcclimated = [
    'México',           // 2200m home
    'Ecuador',          // Quito 2850m
    'Bolivia',          // La Paz 3640m (not in WC but for safety)
    'Colombia',         // Bogotá 2640m
    'Estados Unidos',   // Denver 1600m exposure
    'Canadá',           // Calgary 1045m exposure
  ];

  // If team is acclimated, small bonus at altitude venues
  if (altitudeAcclimated.includes(teamName)) {
    if (venue.altitudeCategory === 'high') return 1.08;
    if (venue.altitudeCategory === 'moderate') return 1.03;
  }

  // CONCACAF teams have partial acclimation
  const concacafTeams = ['México', 'Estados Unidos', 'Canadá', 'Panamá', 'Costa Rica', 'Jamaica', 'Haití', 'Curazao', 'Honduras'];
  if (concacafTeams.includes(teamName)) {
    if (venue.altitudeCategory === 'high') return 0.92;
    if (venue.altitudeCategory === 'moderate') return 0.97;
  }

  // South American teams from altitude get partial benefit
  const southAmericanAltitude = ['Ecuador', 'Colombia'];
  if (southAmericanAltitude.includes(teamName)) {
    if (venue.altitudeCategory === 'high') return 1.05;
    if (venue.altitudeCategory === 'moderate') return 1.02;
  }

  // Non-acclimated teams suffer at altitude
  if (venue.altitudeCategory === 'high') {
    // ~2200m: ~15% reduction in VO2 max for non-acclimated
    return 0.85;
  }
  if (venue.altitudeCategory === 'moderate') {
    // ~1500m: ~8% reduction
    return 0.92;
  }

  return 1.0;
}
