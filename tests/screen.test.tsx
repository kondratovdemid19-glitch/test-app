import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import fixture from '../data/matches.json';
import { MatchesScreen } from '../src/screens/MatchesScreen';

const response = (body: unknown) => ({ ok: true, json: async () => body });

afterEach(() => vi.unstubAllGlobals());

describe('экран матчей', () => {
  it('показывает нулевой счёт, перенос, live и фильтрует по статусу', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(fixture)));
    render(<MatchesScreen />);
    expect(screen.getByText('Загрузка матчей…')).toBeTruthy();
    await screen.findByText('Локомотив — ЦСКА');
    expect(screen.getByText('0 : 0')).toBeTruthy();
    expect(screen.getByText('Идёт · 67′')).toBeTruthy();
    expect(screen.getByText('Дата будет уточнена')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Предстоящие' }));
    expect(screen.queryByText('Локомотив — ЦСКА')).toBeNull();
    expect(screen.queryByText('Динамо — Рубин')).toBeNull();
    expect(screen.getByText('Балтика — Факел')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Завершённые' }));
    expect(screen.getByText('Локомотив — ЦСКА')).toBeTruthy();
    expect(screen.queryByText('Балтика — Факел')).toBeNull();
  });

  it('избранное сохраняется при переключении фильтров', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(fixture)));
    render(<MatchesScreen />);
    await screen.findByText('Зенит — Спартак');
    const card = screen.getByLabelText('Зенит — Спартак');
    fireEvent.click(within(card).getByRole('button', { name: 'Добавить в избранное' }));
    fireEvent.click(screen.getByRole('button', { name: 'Предстоящие' }));
    fireEvent.click(screen.getByRole('button', { name: 'Все' }));
    expect(within(screen.getByLabelText('Зенит — Спартак')).getByRole('button', { name: 'Убрать из избранного' })).toBeTruthy();
  });

  it('после ошибки HTTP повторяет запрос и показывает пустой ответ', async () => {
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce(response({ round: 12, matches: [] }));
    vi.stubGlobal('fetch', fetch);
    render(<MatchesScreen />);
    await screen.findByText('Не удалось загрузить матчи. Попробуйте ещё раз.');
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));
    await screen.findByText('В этом туре пока нет матчей.');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('не теряет загруженные матчи при неудачном обновлении', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(response(fixture)).mockRejectedValueOnce(new Error('offline')));
    render(<MatchesScreen />);
    await screen.findByText('Зенит — Спартак');
    fireEvent.click(screen.getByRole('button', { name: 'Обновить' }));
    await screen.findByText('Не удалось обновить матчи. Показаны последние загруженные данные.');
    expect(screen.getByText('Зенит — Спартак')).toBeTruthy();
  });

  it('повреждённый ответ становится ошибкой, а не падением экрана', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ matches: [{ id: 'm1' }] })));
    render(<MatchesScreen />);
    await screen.findByText('Не удалось загрузить матчи. Попробуйте ещё раз.');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Повторить' }).getAttribute('aria-disabled')).not.toBe('true'));
  });
});
