import { useMemo, useState } from 'react';
import { FlatList, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { VenueLogo } from '@/components/venue/VenueLogo';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { formatDistance } from '@/lib/format';
import { instagramUrl } from '@/lib/instagram';
import { useLocationStore } from '@/stores/locationStore';
import { useResponsive } from '@/hooks/useResponsive';
import { useVenues } from '@/hooks/useVenues';
import { Venue } from '@/types/models';

export default function VenuesScreen() {
  const router = useRouter();
  const origin = useLocationStore((s) => s.origin);
  const { gutter } = useResponsive();
  const [query, setQuery] = useState('');

  const { venues, isLoading, isError, refetch } = useVenues({ lat: origin.lat, lng: origin.lng });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return venues;
    // Se busca también por ciudad y dirección: en la costa la gente busca
    // "Gesell" o "Cariló" tanto como el nombre del lugar.
    return venues.filter((v) =>
      [v.name, v.city, v.address ?? ''].some((field) => field.toLowerCase().includes(needle))
    );
  }, [venues, query]);

  return (
    <Screen edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingHorizontal: gutter }]}>
        <View style={styles.titleRow}>
          <PressableScale
            style={styles.backButton}
            scaleTo={0.9}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </PressableScale>
          <Text style={styles.title}>Boliches</Text>
          <PressableScale
            style={styles.backButton}
            scaleTo={0.9}
            onPress={() => router.push('/(tabs)/map')}
            accessibilityRole="button"
            accessibilityLabel="Ver los boliches en el mapa"
          >
            <Ionicons name="map-outline" size={20} color={colors.accent} />
          </PressableScale>
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre o zona…"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
            // Sin esto, iOS pone en mayúscula la primera letra de cada
            // palabra mientras se escribe, que en un buscador molesta.
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: gutter, gap: spacing.sm }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} style={styles.rowSkeleton} />
          ))}
        </View>
      ) : isError ? (
        <EmptyState
          icon={<Ionicons name="warning-outline" size={40} color={colors.danger} />}
          title="No pudimos cargar los boliches"
          description="Revisá tu conexión e intentá de nuevo."
          actionLabel="Reintentar"
          onAction={() => refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="musical-notes-outline" size={40} color={colors.textMuted} />}
          title={query ? 'Sin resultados' : 'Todavía no hay boliches cargados'}
          description={
            query
              ? `No encontramos nada que coincida con "${query.trim()}".`
              : 'Estamos armando el directorio de la costa. Volvé en unos días.'
          }
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <VenueRow venue={item} />}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </Screen>
  );
}

function VenueRow({ venue }: { venue: Venue }) {
  const igUrl = instagramUrl(venue.instagram);

  return (
    <Card elevated style={styles.row}>
      <VenueLogo uri={venue.logoUrl} name={venue.name} size={52} />

      <View style={styles.rowText}>
        <Text style={styles.rowName} numberOfLines={1}>
          {venue.name}
        </Text>
        <Text style={styles.rowAddress} numberOfLines={1}>
          {venue.address ?? venue.city}
        </Text>
        {venue.distanceMeters != null ? (
          <Text style={styles.rowDistance}>a {formatDistance(venue.distanceMeters)}</Text>
        ) : null}
      </View>

      {igUrl ? (
        <PressableScale
          style={styles.igButton}
          scaleTo={0.9}
          onPress={() => Linking.openURL(igUrl).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel={`Abrir el Instagram de ${venue.name}`}
        >
          <Ionicons name="logo-instagram" size={20} color={colors.accent} />
        </PressableScale>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm, paddingBottom: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
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
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.size.md,
    // En web el input trae un contorno propio al enfocarse que no sigue la
    // paleta; el borde de la barra ya cumple esa función.
    outlineStyle: 'none',
  } as any,
  // Mismo alto que una fila real, para que la lista no salte al cargar.
  rowSkeleton: { height: 76, borderRadius: radii.lg },
  list: { paddingBottom: spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1, minWidth: 0 },
  rowName: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  rowAddress: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 2 },
  rowDistance: {
    color: colors.accent,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    marginTop: 3,
  },
  igButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
