import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
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

export default function MapScreen() {
  const router = useRouter();
  const origin = useLocationStore((s) => s.origin);
  const radiusKm = useLocationStore((s) => s.radiusKm);
  const [categorySlug, setCategorySlug] = useState('all');
  const [selectedCluster, setSelectedCluster] = useState<MarkerCluster | null>(null);

  const { categories } = useCategories();
  const feed = useEventsFeed({ lat: origin.lat, lng: origin.lng, radiusKm, categorySlug, orderBy: 'distance' });
  const events = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const clusters = useMemo(() => clusterEvents(events), [events]);
  const zoom = useMemo(() => radiusKmToZoom(radiusKm), [radiusKm]);
  const markers = useMemo<MapMarkerSpec[]>(() => {
    const clusterMarkers: MapMarkerSpec[] = clusters.map((cluster) => ({
      id: cluster.key,
      kind: 'photo',
      lat: cluster.lat,
      lng: cluster.lng,
      photoUrl: cluster.events[0].coverImageUrl,
      badge: cluster.events.length,
    }));
    if (origin.isCurrentLocation) {
      clusterMarkers.push({ id: 'me', kind: 'dot', lat: origin.lat, lng: origin.lng, color: colors.accent });
    }
    return clusterMarkers;
  }, [clusters, origin]);
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

      <View style={styles.mapWrapper}>
        <AppMap
          style={StyleSheet.absoluteFill}
          center={{ lat: origin.lat, lng: origin.lng }}
          zoom={zoom}
          markers={markers}
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
  mapWrapper: { flex: 1 },
  loadingOverlay: {
    position: 'absolute',
    top: spacing.lg,
    alignSelf: 'center',
    backgroundColor: colors.overlay,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
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
