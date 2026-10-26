import { describe, expect, it } from 'vitest';
import fixture from '../data/matches.json';
import { matchesFilter, parseMatches, startLabel, statusLabel } from '../src/matches';

describe('неочевидные данные', () => {
  it('не теряет ничью 0:0 и не считает прошлую дату признаком завершения', () => {
    const data = parseMatches(fixture);
    expect(data.matches[1].score).toEqual({ home: 0, away: 0 });
    expect(data.matches.filter((match) => matchesFilter(match, 'upcoming')).map((match) => match.id))
      .toEqual(['m5', 'm6', 'm7', 'm8']);
    expect(data.matches.filter((match) => matchesFilter(match, 'finished')).map((match) => match.id))
      .toEqual(['m1', 'm2', 'm3']);
  });

  it('оставляет неизвестный статус только во вкладке «Все»', () => {
    const match = { ...parseMatches(fixture).matches[0], status: 'cancelled' };
    expect(matchesFilter(match, 'all')).toBe(true);
    expect(matchesFilter(match, 'upcoming')).toBe(false);
    expect(matchesFilter(match, 'finished')).toBe(false);
    expect(statusLabel(match)).toBe('Статус уточняется');
  });

  it('не превращает отсутствующую дату в 1 января 1970 года', () => {
    expect(startLabel(null)).toBe('Дата будет уточнена');
    expect(startLabel('invalid')).toBe('Дата будет уточнена');
  });

  it('отклоняет отрицательный счёт и повторяющиеся id', () => {
    const match = parseMatches(fixture).matches[0];
    expect(() => parseMatches({ round: 12, matches: [match, match] })).toThrow('Invalid match');
    expect(() => parseMatches({ round: 12, matches: [{ ...match, score: { home: -1, away: 0 } }] })).toThrow('Invalid match');
  });
});
