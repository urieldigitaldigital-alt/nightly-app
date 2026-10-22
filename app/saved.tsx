import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { EventCard } from '@/components/event/EventCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, spacing, typography } from '@/constants/theme';
import { fetchSavedEventsNear } from '@/services/saved';
import { useToggleSaveEvent } from '@/hooks/useSavedEvents';
import { useLocationStore } from '@/stores/locationStore';

export default function SavedScreen() {
  const router = useRouter();
  const origin = useLocationStore((s) => s.origin);
  const queryClient = useQueryClient();
  const toggleSave = useToggleSaveEvent();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-events-near', origin.lat, origin.lng],
    queryFn: () => fetchSavedEventsNear(origin.lat, origin.lng),
  });

  const events = useMemo(() => data ?? [], [data]);

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Guardados</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : events.length === 0 ? (
        <EmptyState icon={<Ionicons name="bookmark-outline" size={36} color={colors.textMuted} />} title="Nada guardado todavía" description="Tocá el ícono de guardar en cualquier fiesta para encontrarla acá después." />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              saved
              onPress={() => router.push(`/event/${item.id}`)}
              onToggleSave={() =>
                toggleSave.mutate(
                  { eventId: item.id, nextSaved: false },
                  { onSettled: () => queryClient.invalidateQueries({ queryKey: ['saved-events-near'] }) }
                )
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
});
