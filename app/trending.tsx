import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EventCard } from '@/components/event/EventCard';
import { colors, spacing, typography } from '@/constants/theme';
import { useLocationStore } from '@/stores/locationStore';
import { useEventsFeed } from '@/hooks/useEventsFeed';
import { useSavedEventIds, useToggleSaveEvent } from '@/hooks/useSavedEvents';

export default function TrendingScreen() {
  const router = useRouter();
  const origin = useLocationStore((s) => s.origin);

  const feed = useEventsFeed({ lat: origin.lat, lng: origin.lng, radiusKm: 50, categorySlug: 'all', orderBy: 'popularity', pageSize: 30 } as any);
  const savedIds = useSavedEventIds();
  const toggleSave = useToggleSaveEvent();
  const events = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const savedSet = useMemo(() => new Set(savedIds.data ?? []), [savedIds.data]);

  const now = Date.now();

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Tendencias</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={styles.subtitle}>Ordenado por asistentes confirmados cerca de {origin.label}.</Text>

      {feed.isLoading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState title="Todavía no hay tendencias" description="Cuando haya más fiestas confirmadas en tu zona, vas a verlas ordenadas por popularidad acá." />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item, index }) => {
            const hoursToStart = (new Date(item.startsAt).getTime() - now) / 3_600_000;
            const tags: string[] = [];
            if (index < 3 && item.confirmedCount > 0) tags.push('Popular');
            if (hoursToStart > 0 && hoursToStart < 48) tags.push('Próximamente');
            if (item.spotsLeft !== null && item.spotsLeft > 0 && item.spotsLeft <= 5) tags.push('Últimas plazas');

            return (
              <View>
                {tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {tags.map((t) => (
                      <Badge key={t} label={t} tone="accent" />
                    ))}
                  </View>
                )}
                <EventCard
                  event={item}
                  saved={savedSet.has(item.id)}
                  onPress={() => router.push(`/event/${item.id}`)}
                  onToggleSave={() => toggleSave.mutate({ eventId: item.id, nextSaved: !savedSet.has(item.id) })}
                />
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  subtitle: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xxs, marginBottom: spacing.md },
  tagRow: { flexDirection: 'row', gap: spacing.xxs, marginBottom: spacing.xxs },
});
