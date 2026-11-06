import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EventCard } from '@/components/event/EventCard';
import { EventCardSkeleton } from '@/components/event/EventCardSkeleton';
import { LocationSheet } from '@/components/LocationSheet';
import { colors, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useLocationStore } from '@/stores/locationStore';
import { useCategories } from '@/hooks/useCategories';
import { useEventsFeed } from '@/hooks/useEventsFeed';
import { useResponsive } from '@/hooks/useResponsive';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function DiscoverScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const origin = useLocationStore((s) => s.origin);
  const radiusKm = useLocationStore((s) => s.radiusKm);
  const [categorySlug, setCategorySlug] = useState('all');
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);

  const { categories } = useCategories();
  const { columns, gutter } = useResponsive();

  const feed = useEventsFeed({ lat: origin.lat, lng: origin.lng, radiusKm, categorySlug });
  const events = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);

  if (!isSupabaseConfigured) {
    return (
      <Screen padded>
        <EmptyState
          icon={<Ionicons name="cloud-offline-outline" size={40} color={colors.textMuted} />}
          title="Backend no configurado"
          description="Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en tu .env. Copiá .env.example y completá tus credenciales de Supabase."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: gutter }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hola{profile ? `, ${profile.displayName.split(' ')[0]}` : ''} 👋</Text>
            <Pressable style={styles.locationRow} onPress={() => setLocationSheetOpen(true)}>
              <Ionicons name="location" size={14} color={colors.accent} />
              <Text style={styles.locationText}>{origin.label}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </Pressable>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={() => router.push('/notifications')} hitSlop={8}>
              <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        <Pressable style={styles.searchBar} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Buscar fiestas, zonas, organizadores...</Text>
        </Pressable>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.slug}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item }) => (
            <CategoryChip label={item.label} active={categorySlug === item.slug} onPress={() => setCategorySlug(item.slug)} />
          )}
        />
      </View>

      {feed.isLoading ? (
        <View style={styles.feedList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={i > 0 && { marginTop: spacing.md }}>
              <EventCardSkeleton />
            </View>
          ))}
        </View>
      ) : feed.isError ? (
        <EmptyState
          icon={<Ionicons name="warning-outline" size={40} color={colors.danger} />}
          title="No pudimos cargar las fiestas"
          description="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => feed.refetch()}
        />
      ) : events.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="moon-outline" size={40} color={colors.textMuted} />}
          title="Nada por acá todavía"
          description={`No hay fiestas publicadas a ${radiusKm} km de ${origin.label}. Probá ampliar el radio o cambiar de categoría.`}
          actionLabel="Publicar una fiesta"
          onAction={() => router.push('/(tabs)/publish')}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          // FlatList no reconstruye su layout interno si numColumns cambia en
          // caliente; cambiar la key la fuerza a remontar. Pasa de verdad al
          // rotar un iPad o al redimensionar la ventana del navegador.
          key={`feed-${columns}`}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap: spacing.md } : undefined}
          contentContainerStyle={[styles.feedList, { paddingHorizontal: gutter }]}
          refreshControl={
            <RefreshControl
              tintColor={colors.accent}
              refreshing={feed.isRefetching}
              onRefresh={() => {
                feed.refetch();
              }}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          renderItem={({ item, index }) => (
            // En grilla, cada celda tiene que declarar su propio ancho
            // flexible o la tarjeta se expande y rompe las columnas.
            <View style={columns > 1 ? styles.gridCell : undefined}>
              <EventCard event={item} index={index} onPress={() => router.push(`/event/${item.id}`)} />
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListFooterComponent={feed.isFetchingNextPage ? <LoadingState /> : undefined}
        />
      )}

      <LocationSheet visible={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: typography.size.md },
  categoryList: { gap: spacing.xs, paddingVertical: spacing.xxs },
  feedList: { paddingBottom: spacing.xxxl, paddingTop: spacing.xs },
  gridCell: { flex: 1 },
});
