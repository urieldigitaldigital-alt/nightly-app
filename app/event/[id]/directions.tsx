import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppMap from '@/components/map/AppMap';
import type { MapMarkerSpec } from '@/components/map/AppMap.types';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { latLngDeltaToZoom } from '@/lib/mapZoom';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useLocationStore } from '@/stores/locationStore';
import { fetchDrivingDirections, DirectionsResult } from '@/services/directions';
import { decodePolyline } from '@/lib/polyline';

export default function DirectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEventDetail(id);
  const fallbackOrigin = useLocationStore((s) => s.origin);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
      } else {
        setUserCoords({ lat: fallbackOrigin.lat, lng: fallbackOrigin.lng });
      }
    })();
  }, [fallbackOrigin]);

  const destLat = event?.exactLat ?? null;
  const destLng = event?.exactLng ?? null;

  useEffect(() => {
    if (!userCoords || !event?.exactAddress || destLat == null || destLng == null) return;
    setLoadingDirections(true);
    fetchDrivingDirections(userCoords.lat, userCoords.lng, destLat, destLng)
      .then(setDirections)
      .finally(() => setLoadingDirections(false));
  }, [userCoords, event?.exactAddress, destLat, destLng]);

  if (isLoading || !userCoords) return <LoadingState fullscreen />;

  if (!event?.exactAddress) {
    return (
      <Screen padded>
        <EmptyState
          icon={<Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />}
          title="Todavía no tenés acceso a la ubicación"
          description="La dirección exacta se habilita cuando el organizador acepta tu solicitud."
          actionLabel="Volver"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const openInExternalMaps = () => {
    const destination = `${event.exactLat},${event.exactLng}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${destination}&dirflg=d`,
      android: `google.navigation:q=${destination}&mode=d`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });
    if (url) Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`));
  };

  const routeCoords = directions ? decodePolyline(directions.polyline).map((p) => ({ lat: p.latitude, lng: p.longitude })) : [];

  const mapCenter = {
    lat: (userCoords.lat + (event.exactLat ?? userCoords.lat)) / 2,
    lng: (userCoords.lng + (event.exactLng ?? userCoords.lng)) / 2,
  };
  const mapZoom = latLngDeltaToZoom(Math.max(Math.abs(userCoords.lat - (event.exactLat ?? 0)) * 2.2, 0.02));
  const mapMarkers: MapMarkerSpec[] = [
    { id: 'me', kind: 'dot', lat: userCoords.lat, lng: userCoords.lng, color: colors.textSecondary },
    { id: 'dest', kind: 'dot', lat: event.exactLat!, lng: event.exactLng!, color: colors.accent },
  ];

  return (
    <Screen edges={['bottom']}>
      <View style={styles.mapWrapper}>
        <AppMap
          style={StyleSheet.absoluteFill}
          center={mapCenter}
          zoom={mapZoom}
          markers={mapMarkers}
          route={routeCoords}
          routeColor={colors.accent}
        />
      </View>

      <View style={styles.panel}>
        <Text style={styles.address}>{event.exactAddress}</Text>

        {loadingDirections ? (
          <LoadingState />
        ) : directions ? (
          <View style={styles.etaRow}>
            <Ionicons name="car-outline" size={18} color={colors.accent} />
            <Text style={styles.etaText}>
              {directions.distanceText} · {directions.durationText} en auto
            </Text>
          </View>
        ) : (
          <Text style={styles.hint}>No pudimos calcular la ruta ahora, pero podés abrir la navegación completa igual.</Text>
        )}

        <Button label="Iniciar navegación" onPress={openInExternalMaps} icon={<Ionicons name="navigate" size={18} color={colors.accentText} />} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mapWrapper: { flex: 1 },
  panel: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  address: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  etaText: { color: colors.textSecondary, fontSize: typography.size.md },
  hint: { color: colors.textMuted, fontSize: typography.size.xs, lineHeight: 16 },
});
