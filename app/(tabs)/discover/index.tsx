import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Chip, ChipRow } from '@/components/ui/Chip';
import { HeroAction, HeroCard } from '@/components/ui/HeroCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EventCard } from '@/components/event/EventCard';
import { EventCardSkeleton } from '@/components/event/EventCardSkeleton';
import { LocationSheet } from '@/components/LocationSheet';
import { useBottomNavInset } from '@/components/nav/BottomNav';
import { colors, radii, spacing, typography } from '@/constants/theme';
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
  const navInset = useBottomNavInset();

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

  // El número de la card grande sale de lo que ya trajo el feed, así que
  // mientras carga no se muestra un cero: un cero y "todavía no cargó" se
  // ven igual pero significan cosas muy distintas.
  const nearbyCount = feed.isLoading ? '—' : events.length;

  const header = (
    <View style={styles.header}>
      <View style={[styles.headerTop, { paddingHorizontal: gutter }]}>
        <Pressable
          style={styles.identity}
          onPress={() => router.push('/(tabs)/profile')}
          accessibilityRole="button"
          accessibilityLabel="Ir a mi perfil"
        >
          <View style={styles.avatarRing}>
            <Avatar uri={profile?.avatarUrl} name={profile?.displayName ?? 'Afterdune'} size={38} />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.greeting} numberOfLines={1}>
              Hola{profile ? `, ${profile.displayName.split(' ')[0]}` : ''} 👋
            </Text>
            <Pressable style={styles.locationRow} onPress={() => setLocationSheetOpen(true)} hitSlop={6}>
              <Ionicons name="location" size={13} color={colors.accent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {origin.label}
              </Text>
              <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
            </Pressable>
          </View>
        </Pressable>

        <Pressable
          style={styles.iconTile}
          onPress={() => router.push('/notifications')}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
        >
          <Ionicons name="notifications-outline" size={21} color={colors.textPrimary} />
        </Pressable>
      </View>

      <Pressable
        style={[styles.searchBar, { marginHorizontal: gutter }]}
        onPress={() => router.push('/search')}
        accessibilityRole="button"
        accessibilityLabel="Buscar"
      >
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <Text style={styles.searchPlaceholder} numberOfLines={1}>
          Buscar fiestas, zonas, organizadores…
        </Text>
      </Pressable>

      <View style={{ marginHorizontal: gutter }}>
        <HeroCard
          title="Esta noche cerca tuyo"
          value={nearbyCount}
          subtitle={`A menos de ${radiusKm} km de ${origin.label}`}
        >
          <HeroAction icon="map" label="Mapa" onPress={() => router.push('/(tabs)/map')} />
          <HeroAction icon="musical-notes" label="Boliches" onPress={() => router.push('/boliches')} />
          <HeroAction icon="flame" label="Tendencias" onPress={() => router.push('/trending')} />
          <HeroAction icon="add-circle" label="Crear" onPress={() => router.push('/(tabs)/publish')} />
        </HeroCard>
      </View>

      <ChipRow>
        {categories.map((category) => (
          <Chip
            key={category.slug}
            label={category.label}
            active={categorySlug === category.slug}
            onPress={() => setCategorySlug(category.slug)}
          />
        ))}
      </ChipRow>

      <View style={{ paddingHorizontal: gutter }}>
        <SectionHeader title="Cerca tuyo" onViewAll={() => router.push('/(tabs)/map')} viewAllLabel="En el mapa" />
      </View>
    </View>
  );

  const body = () => {
    if (feed.isLoading) {
      return (
        <View style={{ paddingHorizontal: gutter, gap: spacing.md }}>
          {[0, 1, 2].map((i) => (
            <EventCardSkeleton key={i} />
          ))}
        </View>
      );
    }
    if (feed.isError) {
      return (
        <EmptyState
          icon={<Ionicons name="warning-outline" size={40} color={colors.danger} />}
          title="No pudimos cargar las fiestas"
          description="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => feed.refetch()}
        />
      );
    }
    return (
      <EmptyState
        icon={<Ionicons name="moon-outline" size={40} color={colors.textMuted} />}
        title="Nada por acá todavía"
        description={`No hay fiestas publicadas a ${radiusKm} km de ${origin.label}. Probá ampliar el radio o cambiar de categoría.`}
        actionLabel="Publicar una fiesta"
        onAction={() => router.push('/(tabs)/publish')}
      />
    );
  };

  return (
    <Screen edges={['top']}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        // FlatList no reconstruye su layout interno si numColumns cambia en
        // caliente; cambiar la key la fuerza a remontar. Pasa de verdad al
        // rotar un iPad o al redimensionar la ventana del navegador.
        key={`feed-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: spacing.md } : undefined}
        // El encabezado va acá y no arriba del FlatList para que se desplace
        // con la lista en vez de quedar fijo comiéndose media pantalla.
        ListHeaderComponent={header}
        ListEmptyComponent={body}
        contentContainerStyle={[
          styles.feedList,
          { paddingHorizontal: columns > 1 || events.length > 0 ? gutter : 0 },
          // La barra inferior flota por encima del contenido: sin este
          // espacio, la última tarjeta queda tapada y no se puede tocar.
          { paddingBottom: navInset + spacing.lg },
        ]}
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

      <LocationSheet visible={locationSheetOpen} onClose={() => setLocationSheetOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingBottom: spacing.xs },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 0 },
  avatarRing: {
    // El aro cian de 1.5 es lo que ata el avatar a la identidad de la marca;
    // el relleno de 2 evita que el borde se coma el recorte de la foto.
    padding: 2,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  identityText: { flex: 1, minWidth: 0 },
  greeting: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  locationText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
  iconTile: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  searchPlaceholder: { flex: 1, color: colors.textMuted, fontSize: typography.size.md },
  feedList: { paddingTop: spacing.xs },
  gridCell: { flex: 1 },
});
