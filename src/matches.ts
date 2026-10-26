export type Match = {
  id: string;
  startsAt: string | null;
  status: string;
  minute?: number;
  home: { name: string };
  away: { name: string };
  score: { home: number; away: number } | null;
};

export type MatchesResponse = { round: number; matches: Match[] };
export type Filter = 'all' | 'upcoming' | 'finished';

const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;
const nonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

export function parseMatches(value: unknown): MatchesResponse {
  if (!object(value) || !nonNegativeInteger(value.round) || !Array.isArray(value.matches)) {
    throw new Error('Invalid matches response');
  }
  const ids = new Set<string>();
  for (const match of value.matches) {
    if (!object(match) || typeof match.id !== 'string' || !match.id || ids.has(match.id)
      || typeof match.status !== 'string'
      || (match.startsAt !== null && typeof match.startsAt !== 'string')
      || !object(match.home) || typeof match.home.name !== 'string'
      || !object(match.away) || typeof match.away.name !== 'string'
      || (match.minute !== undefined && !nonNegativeInteger(match.minute))
      || (match.score !== null && (!object(match.score)
        || !nonNegativeInteger(match.score.home) || !nonNegativeInteger(match.score.away)))) {
      throw new Error('Invalid match');
    }
    ids.add(match.id);
  }
  return value as MatchesResponse;
}

export function matchesFilter(match: Match, filter: Filter): boolean {
  if (filter === 'upcoming') return match.status === 'scheduled' || match.status === 'postponed';
  if (filter === 'finished') return match.status === 'finished';
  return true;
}

export function statusLabel(match: Match): string {
  switch (match.status) {
    case 'scheduled': return 'Предстоит';
    case 'finished': return 'Завершён';
    case 'postponed': return 'Перенесён';
    case 'live': return match.minute === undefined ? 'Идёт' : `Идёт · ${match.minute}′`;
    default: return 'Статус уточняется';
  }
}

export function startLabel(startsAt: string | null): string {
  if (!startsAt) return 'Дата будет уточнена';
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return 'Дата будет уточнена';
  return date.toLocaleString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
