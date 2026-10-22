import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppMap from '@/components/map/AppMap';
import type { LatLng, MapMarkerSpec } from '@/components/map/AppMap.types';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { haversineMeters } from '@/lib/geo';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useLocationStore } from '@/stores/locationStore';
import { fetchDrivingDirections, DirectionsResult } from '@/services/directions';
import { decodePolyline } from '@/lib/polyline';

// Street-level, tilted "in navigation" view — matches the live-tracking
// follow mode this screen puts the map in (see FOLLOW below).
const FOLLOW_ZOOM = 17;
const FOLLOW_PITCH = 60;
const OVERVIEW_BEARING = -17;
// Below this, re-fetching a route from OSRM on every GPS tick would just
// hammer their free router for a route that hasn't meaningfully changed.
const REROUTE_THRESHOLD_METERS = 30;

export default function DirectionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: event, isLoading } = useEventDetail(id);
  const fallbackOrigin = useLocationStore((s) => s.origin);
  const [userCoords, setUserCoords] = useState<LatLng | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [directions, setDirections] = useState<DirectionsResult | null>(null);
  const [loadingDirections, setLoadingDirections] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [viewState, setViewState] = useState<{ center: LatLng; zoom: number; pitch: number; bearing: number } | null>(null);

  const isFollowingRef = useRef(isFollowing);
  isFollowingRef.current = isFollowing;
  const lastBearingRef = useRef(OVERVIEW_BEARING);
  const lastFetchCoordsRef = useRef<LatLng | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        if (!cancelled) setUserCoords({ lat: fallbackOrigin.lat, lng: fallbackOrigin.lng });
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (position) => {
          const coords: LatLng = { lat: position.coords.latitude, lng: position.coords.longitude };
          const liveHeading = position.coords.heading;
          const validHeading = liveHeading != null && liveHeading >= 0 ? liveHeading : null;
          if (validHeading != null) lastBearingRef.current = validHeading;

          setUserCoords(coords);
          setHeading(validHeading);
          if (isFollowingRef.current) {
            setViewState({ center: coords, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH, bearing: lastBearingRef.current });
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [fallbackOrigin]);

  const destLat = event?.exactLat ?? null;
  const destLng = event?.exactLng ?? null;

  useEffect(() => {
    if (!userCoords || !event?.exactAddress || destLat == null || destLng == null) return;
    const last = lastFetchCoordsRef.current;
    if (last && haversineMeters(last, userCoords) < REROUTE_THRESHOLD_METERS) return;
    lastFetchCoordsRef.current = userCoords;
    setLoadingDirections(true);
    fetchDrivingDirections(userCoords.lat, userCoords.lng, destLat, destLng)
      .then(setDirections)
      .finally(() => setLoadingDirections(false));
  }, [userCoords, event?.exactAddress, destLat, destLng]);

  const handleRecenter = () => {
    if (!userCoords) return;
    setIsFollowing(true);
    setViewState({ center: userCoords, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH, bearing: lastBearingRef.current });
  };

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

  const view = viewState ?? { center: userCoords, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH, bearing: lastBearingRef.current };
  const mapMarkers: MapMarkerSpec[] = [
    { id: 'me', kind: 'dot', lat: userCoords.lat, lng: userCoords.lng, color: colors.accent, heading: heading ?? undefined },
    { id: 'dest', kind: 'dot', lat: event.exactLat!, lng: event.exactLng!, color: colors.textSecondary },
  ];

  return (
    <Screen edges={['bottom']}>
      <View style={styles.mapWrapper}>
        <AppMap
          style={StyleSheet.absoluteFill}
          center={view.center}
          zoom={view.zoom}
          pitch={view.pitch}
          bearing={view.bearing}
          markers={mapMarkers}
          route={routeCoords}
          routeColor={colors.accent}
          onUserPanStart={() => setIsFollowing(false)}
        />

        {!isFollowing && (
          <Pressable style={styles.recenterButton} onPress={handleRecenter}>
            <Ionicons name="locate" size={20} color={colors.accentText} />
          </Pressable>
        )}
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
  recenterButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  panel: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  address: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  etaText: { color: colors.textSecondary, fontSize: typography.size.md },
  hint: { color: colors.textMuted, fontSize: typography.size.xs, lineHeight: 16 },
});
