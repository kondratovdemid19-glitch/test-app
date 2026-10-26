import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { FavoriteButton } from '../components/FavoriteButton';
import { UpdatedAgo } from '../components/UpdatedAgo';
import { MATCHES_URL } from '../config';
import { useFavorites } from '../hooks/useFavorites';
import { matchesFilter, parseMatches, startLabel, statusLabel } from '../matches';
import type { Filter, Match, MatchesResponse } from '../matches';

const filters: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'upcoming', label: 'Предстоящие' },
  { value: 'finished', label: 'Завершённые' },
];

function MatchCard({ match, favorite, onToggle }: { match: Match; favorite: boolean; onToggle: () => void }) {
  const teams = `${match.home.name} — ${match.away.name}`;
  return (
    <View style={styles.card} accessibilityLabel={teams}>
      <View style={styles.row}>
        <Text style={styles.teams}>{teams}</Text>
        <FavoriteButton active={favorite} onPress={onToggle} />
      </View>
      <Text style={styles.score}>
        {match.score === null ? '— : —' : `${match.score.home} : ${match.score.away}`}
      </Text>
      <Text style={[styles.status, match.status === 'live' && styles.live]}>{statusLabel(match)}</Text>
      <Text style={styles.date}>{startLabel(match.startsAt)}</Text>
    </View>
  );
}

export function MatchesScreen() {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');
  const { favorites, isFavorite, toggle } = useFavorites();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setLoading(true);
    setError(false);
    async function load() {
      try {
        const response = await fetch(MATCHES_URL, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const next = parseMatches(await response.json());
        if (active) {
          setData(next);
          setUpdatedAt(new Date());
        }
      } catch {
        if (active) setError(true);
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);

  const visible = data?.matches.filter((match) => matchesFilter(match, filter)) ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>Матчи тура{data ? ` · ${data.round}` : ''}</Text>
        <Pressable accessibilityRole="button" disabled={loading} style={[styles.button, loading && styles.disabled]}
          onPress={() => setAttempt((current) => current + 1)}>
          <Text style={styles.buttonText}>{loading && data ? 'Обновление…' : 'Обновить'}</Text>
        </Pressable>
      </View>
      {updatedAt && <UpdatedAgo since={updatedAt} />}
      <Text style={styles.date}>Время начала — в часовом поясе устройства</Text>
      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item.value} accessibilityRole="button" accessibilityState={{ selected: filter === item.value }}
            style={[styles.filter, filter === item.value && styles.selected]} onPress={() => setFilter(item.value)}>
            <Text style={filter === item.value ? styles.selectedText : styles.filterText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {loading && !data && <View style={styles.message}><ActivityIndicator /><Text>Загрузка матчей…</Text></View>}
      {error && <View style={styles.error} accessibilityRole="alert">
        <Text style={styles.errorText}>{data
          ? 'Не удалось обновить матчи. Показаны последние загруженные данные.'
          : 'Не удалось загрузить матчи. Попробуйте ещё раз.'}</Text>
        <Pressable accessibilityRole="button" disabled={loading} style={styles.button}
          onPress={() => setAttempt((current) => current + 1)}><Text style={styles.buttonText}>Повторить</Text></Pressable>
      </View>}
      {data && <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={visible}
        extraData={favorites}
        keyExtractor={(match) => match.id}
        renderItem={({ item }) => <MatchCard match={item} favorite={isFavorite(item.id)} onToggle={() => toggle(item.id)} />}
        ListEmptyComponent={<Text style={styles.empty}>{data.matches.length === 0
          ? 'В этом туре пока нет матчей.' : 'По этому фильтру матчей нет.'}</Text>}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flexShrink: 1,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 },
  button: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#163e70', borderRadius: 8, alignSelf: 'flex-start' },
  buttonText: { color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.5 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  filter: { padding: 10, borderRadius: 8, backgroundColor: '#edf1f5' },
  selected: { backgroundColor: '#163e70' },
  filterText: { color: '#26384c' },
  selectedText: { color: '#fff' },
  list: { flex: 1 },
  listContent: { paddingBottom: 24, gap: 12 },
  card: { padding: 16, borderWidth: 1, borderColor: '#dce2e9', borderRadius: 12, gap: 8 },
  teams: { fontSize: 17, fontWeight: '600', flex: 1 },
  score: { fontSize: 24, fontWeight: '700', color: '#182c45' },
  status: { fontSize: 14, color: '#374151' },
  live: { color: '#b42318', fontWeight: '600' },
  date: { fontSize: 13, color: '#526174', marginTop: 4 },
  message: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  error: { padding: 12, backgroundColor: '#fff1f0', borderRadius: 8, marginBottom: 12, gap: 12 },
  errorText: { color: '#872820' },
  empty: { paddingVertical: 24, color: '#526174' },
});
