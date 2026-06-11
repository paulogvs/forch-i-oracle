// FORCH.i ORACLE — Timezone utilities
// All match dates/times are stored in UTC. These helpers convert to local timezone.

/**
 * Detect user's timezone offset from UTC in hours.
 * Bolivia = -4, Mexico City = -6, etc.
 */
export function getUserTimezoneOffset(): number {
  return new Date().getTimezoneOffset() / -60; // positive = ahead of UTC
}

/**
 * Get timezone label from offset.
 */
export function getTimezoneLabel(offset: number): string {
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  return `UTC${sign}${abs}`;
}

/**
 * Common timezones for quick selection.
 */
export const TIMEZONE_PRESETS = [
  { label: 'Bolivia', offset: -4 },
  { label: 'México CDMX', offset: -6 },
  { label: 'EE.UU. Este', offset: -5 },
  { label: 'EE.UU. Pacífico', offset: -8 },
  { label: 'España', offset: 1 },
  { label: 'Argentina', offset: -3 },
  { label: 'UTC', offset: 0 },
];

/**
 * Convert a UTC date string and time to a Date object in user's timezone.
 * Then return the localized date and time strings.
 */
export function utcToLocal(dateStr: string, timeStr: string): {
  date: string;       // YYYY-MM-DD in local timezone
  time: string;       // HH:MM in local timezone
  display: string;    // "11 jun · 15:00" format
  dayName: string;    // "jue" format
  isDifferentDay: boolean; // true if local date differs from UTC date
} {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const utcDate = new Date(Date.UTC(
    parseInt(dateStr.split('-')[0]),
    parseInt(dateStr.split('-')[1]) - 1,
    parseInt(dateStr.split('-')[2]),
    hours,
    minutes
  ));

  // Local date/time
  const year = utcDate.getFullYear();
  const month = String(utcDate.getMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getDate()).padStart(2, '0');
  const localTime = `${String(utcDate.getHours()).padStart(2, '0')}:${String(utcDate.getMinutes()).padStart(2, '0')}`;

  // Display format
  const display = utcDate.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
  }).replace('.', '') + ` · ${localTime}`;

  const dayName = utcDate.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');

  // Check if local date differs from UTC date
  const utcDay = dateStr.split('-')[2];
  const localDay = day;
  const isDifferentDay = utcDay !== localDay;

  return {
    date: `${year}-${month}-${day}`,
    time: localTime,
    display,
    dayName,
    isDifferentDay,
  };
}
