import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UpdatedAgo } from '../src/components/UpdatedAgo';
import { useFavorites } from '../src/hooks/useFavorites';

describe('избранное', () => {
  it('изначально пустое; добавление и удаление обновляют карточку', () => {
    const { result } = renderHook(useFavorites);
    expect(result.current.isFavorite('m1')).toBe(false);
    act(() => result.current.toggle('m1'));
    expect(result.current.isFavorite('m1')).toBe(true);
    expect(result.current.isFavorite('m2')).toBe(false);
    act(() => result.current.toggle('m1'));
    expect(result.current.isFavorite('m1')).toBe(false);
  });

  it('не теряет несколько переключений в одном обновлении React', () => {
    const { result } = renderHook(useFavorites);
    act(() => {
      result.current.toggle('m1');
      result.current.toggle('m2');
      result.current.toggle('m1');
    });
    expect(result.current.favorites).toEqual(['m2']);
    expect(result.current.isFavorite('m2')).toBe(true);
  });
});

describe('время обновления', () => {
  afterEach(() => vi.useRealTimers());

  it('считает от даты загрузки, продолжает отсчёт и сбрасывается после обновления', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-26T12:00:05Z'));
    const { rerender, unmount } = render(<UpdatedAgo since={new Date('2026-10-26T12:00:00Z')} />);
    expect(screen.getByText('Обновлено 5 сек назад')).toBeTruthy();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('Обновлено 8 сек назад')).toBeTruthy();
    rerender(<UpdatedAgo since={new Date()} />);
    expect(screen.getByText('Обновлено 0 сек назад')).toBeTruthy();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
