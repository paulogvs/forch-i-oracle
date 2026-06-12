export function normalizeTeamName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function matchKey(home: string, away: string): string {
  const h = normalizeTeamName(home);
  const a = normalizeTeamName(away);
  return [h, a].sort().join('::');
}
