import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import AppMap from '@/components/map/AppMap';
import type { MapMarkerSpec } from '@/components/map/AppMap.types';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useLocationStore } from '@/stores/locationStore';
import { useCategories } from '@/hooks/useCategories';
import { useEventsFeed } from '@/hooks/useEventsFeed';
import { clusterEvents, MarkerCluster } from '@/lib/clustering';
import { radiusKmToZoom } from '@/lib/mapZoom';
import { formatDistance, formatEventDateTime } from '@/lib/format';
import { isSupabaseConfigured } from '@/lib/supabase';

const RADIUS_OPTIONS_KM = [10, 25, 50, 100];

export default function MapScreen() {
  const router = useRouter();
  const origin = useLocationStore((s) => s.origin);
  const radiusKm = useLocationStore((s) => s.radiusKm);
  const setRadiusKm = useLocationStore((s) => s.setRadiusKm);
  const requestPermissionAndLocate = useLocationStore((s) => s.requestPermissionAndLocate);
  const [categorySlug, setCategorySlug] = useState('all');
  const [selectedCluster, setSelectedCluster] = useState<MarkerCluster | null>(null);
  // Modo seguimiento: cuando está activo, el mapa se mantiene centrado en la
  // persona y rota con la brújula — el comportamiento de un GPS. Se apaga
  // solo apenas alguien arrastra el mapa, porque en ese momento la intención
  // es mirar otra parte y pelearle la cámara sería insoportable.
  const [following, setFollowing] = useState(false);
  const [locating, setLocating] = useState(false);

  const { categories } = useCategories();
  const feed = useEventsFeed({ lat: origin.lat, lng: origin.lng, radiusKm, categorySlug, orderBy: 'distance' });
  const events = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const clusters = useMemo(() => clusterEvents(events), [events]);
  const zoom = useMemo(() => radiusKmToZoom(radiusKm), [radiusKm]);
  // Ya no se dibuja un marcador propio de "estás acá": lo hace el mapa
  // nativo con <UserLocation/>, que lo mueve en el hilo nativo y además
  // muestra el círculo de precisión real en vez de un punto que pretende
  // precisión infinita.
  const markers = useMemo<MapMarkerSpec[]>(
    () =>
      clusters.map((cluster) => ({
        id: cluster.key,
        kind: 'photo',
        lat: cluster.lat,
        lng: cluster.lng,
        photoUrl: cluster.events[0].coverImageUrl,
        badge: cluster.events.length,
      })),
    [clusters]
  );

  const handleLocatePress = async () => {
    if (following) {
      setFollowing(false);
      return;
    }
    setLocating(true);
    try {
      // Pide el permiso si todavía no lo tiene y actualiza el origen del
      // feed, para que la lista de fiestas quede en sintonía con el mapa.
      await requestPermissionAndLocate();
      setFollowing(true);
    } finally {
      setLocating(false);
    }
  };
  const clustersByKey = useMemo(() => new Map(clusters.map((c) => [c.key, c])), [clusters]);

  if (!isSupabaseConfigured) {
    return (
      <Screen padded>
        <EmptyState title="Backend no configurado" description="Completá tu .env con las credenciales de Supabase para ver el mapa." />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} style={styles.root}>
      <View style={styles.categoryBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(c) => c.slug}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
          renderItem={({ item }) => (
            <CategoryChip label={item.label} active={categorySlug === item.slug} onPress={() => setCategorySlug(item.slug)} />
          )}
        />
      </View>

      <View style={styles.radiusBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={RADIUS_OPTIONS_KM}
          keyExtractor={(km) => String(km)}
          contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
          renderItem={({ item: km }) => (
            <CategoryChip label={`${km} km`} active={radiusKm === km} onPress={() => setRadiusKm(km)} />
          )}
        />
      </View>

      <View style={styles.mapWrapper}>
        <AppMap
          style={StyleSheet.absoluteFill}
          center={{ lat: origin.lat, lng: origin.lng }}
          zoom={zoom}
          markers={markers}
          showUserLocation
          trackUser={following ? 'heading' : undefined}
          onUserPanStart={() => setFollowing(false)}
          onMarkerPress={(id) => {
            const cluster = clustersByKey.get(id);
            if (cluster) setSelectedCluster(cluster);
          }}
        />

        {feed.isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingState />
          </View>
        )}

        <Pressable
          style={[styles.locateButton, following && styles.locateButtonActive]}
          onPress={handleLocatePress}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel={following ? 'Dejar de seguir mi ubicación' : 'Centrar en mi ubicación'}
        >
          {locating ? (
            <ActivityIndicator size="small" color={following ? colors.accentText : colors.accent} />
          ) : (
            <Ionicons
              name={following ? 'navigate' : 'navigate-outline'}
              size={20}
              color={following ? colors.accentText : colors.accent}
            />
          )}
        </Pressable>

        <Pressable style={styles.listToggle} onPress={() => router.push('/(tabs)/discover')}>
          <Ionicons name="list" size={16} color={colors.textPrimary} />
          <Text style={styles.listToggleText}>Ver como lista</Text>
        </Pressable>
      </View>

      {selectedCluster && (
        <View style={styles.sheet}>
          <Pressable style={styles.sheetClose} onPress={() => setSelectedCluster(null)}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={selectedCluster.events}
            keyExtractor={(e) => e.id}
            contentContainerStyle={{ gap: spacing.sm }}
            renderItem={({ item }) => (
              <Pressable style={styles.miniCard} onPress={() => router.push(`/event/${item.id}`)}>
                <Text style={styles.miniTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.miniMeta} numberOfLines={1}>
                  {formatEventDateTime(item.startsAt)}
                </Text>
                <Text style={styles.miniMeta} numberOfLines={1}>
                  {item.neighborhood ?? item.city} · {item.distanceMeters != null ? formatDistance(item.distanceMeters) : ''}
                </Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { gap: 0 },
  categoryBar: { paddingVertical: spacing.sm },
  radiusBar: { paddingBottom: spacing.sm },
  mapWrapper: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  locateButton: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg + 48,
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  locateButtonActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  listToggle: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  listToggleText: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetClose: { alignSelf: 'flex-end', marginBottom: spacing.xs },
  miniCard: {
    width: 180,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 2,
  },
  miniTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  miniMeta: { color: colors.textMuted, fontSize: typography.size.xs },
});
