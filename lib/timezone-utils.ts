export function formatLocal(date: Date | string, opts?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return new Intl.DateTimeFormat('es-ES', { timeZone: tz, ...opts }).format(d);
}
