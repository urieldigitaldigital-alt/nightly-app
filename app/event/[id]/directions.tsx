import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from '@/components/map/PlatformMap';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { MAP_STYLE } from '@/constants/mapStyle';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useLocationStore } from '@/stores/locationStore';
import { fetchDrivingDirections, isDirectionsApiConfigured, DirectionsResult } from '@/services/directions';
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

  const routeCoords = directions ? decodePolyline(directions.polyline) : [];

  return (
    <Screen edges={['bottom']}>
      <View style={styles.mapWrapper}>
        <MapView
          provider={PROVIDER_GOOGLE}
          customMapStyle={MAP_STYLE}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: (userCoords.lat + (event.exactLat ?? userCoords.lat)) / 2,
            longitude: (userCoords.lng + (event.exactLng ?? userCoords.lng)) / 2,
            latitudeDelta: Math.max(Math.abs(userCoords.lat - (event.exactLat ?? 0)) * 2.2, 0.02),
            longitudeDelta: Math.max(Math.abs(userCoords.lng - (event.exactLng ?? 0)) * 2.2, 0.02),
          }}
        >
          <Marker coordinate={{ latitude: userCoords.lat, longitude: userCoords.lng }} pinColor={colors.textSecondary} title="Vos" />
          <Marker coordinate={{ latitude: event.exactLat!, longitude: event.exactLng! }} title={event.title} />
          {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeColor={colors.accent} strokeWidth={4} />}
        </MapView>
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
        ) : !isDirectionsApiConfigured ? (
          <Text style={styles.hint}>
            Configurá EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY para ver distancia y tiempo estimado real acá mismo. Mientras tanto, abrí
            la navegación completa en Maps.
          </Text>
        ) : null}

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
