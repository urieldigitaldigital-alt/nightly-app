import { useEffect, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppMap from '@/components/map/AppMap';
import type { LatLng, MapMarkerSpec } from '@/components/map/AppMap.types';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { haversineMeters, projectOntoPolyline } from '@/lib/geo';
import { useEventDetail } from '@/hooks/useEventDetail';
import { useLocationStore } from '@/stores/locationStore';
import { fetchDrivingDirections, DirectionsResult, RouteStep, TravelMode } from '@/services/directions';
import { decodePolyline } from '@/lib/polyline';
import { maneuverIconName, maneuverRotationDeg, speakDistancePrefix } from '@/lib/navigationInstructions';
import { speak, stopSpeaking } from '@/lib/voice';

// Street-level, tilted "in navigation" view — matches the live-tracking
// follow mode this screen puts the map in (see FOLLOW below). Navigating
// mode zooms in tighter than the plain preview to read more like a real GPS.
const FOLLOW_ZOOM = 17;
const FOLLOW_PITCH = 60;
const NAV_ZOOM_NEAR = 18.5;
const NAV_ZOOM_FAR = 17.5;
const NAV_PITCH = 65;
const OVERVIEW_BEARING = -17;
// Below this, re-fetching a route from OSRM on every GPS tick would just
// hammer their free router for a route that hasn't meaningfully changed —
// used while still previewing (not yet navigating).
const REROUTE_THRESHOLD_METERS = 30;
// Once actually navigating, "moved 30m" fires constantly even while
// perfectly on-route — reroute only when genuinely off the drawn path, with
// a cooldown so a few noisy GPS ticks in a row can't spam OSRM's free router.
const OFF_ROUTE_METERS = 35;
const MIN_REROUTE_INTERVAL_MS = 8000;
// Distance to a maneuver's coordinate at which we consider it "reached" and
// advance to the next step / announce arrival.
const ADVANCE_STEP_METERS = 18;
const ARRIVE_METERS = 20;
// Distance at which the "imminent" voice cue (just the instruction, no
// distance prefix) fires, on top of the one-time "far" announcement already
// made when the step became current.
const NEAR_MANEUVER_METERS = 40;

type TravelOption = 'auto' | 'moto' | 'pie';
const TRAVEL_OPTIONS: { key: TravelOption; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'moto', label: 'Moto' },
  { key: 'pie', label: 'A pie' },
];

function formatMetersShort(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

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

  const [travelOption, setTravelOption] = useState<TravelOption>('auto');
  const osrmMode: TravelMode = travelOption === 'pie' ? 'walking' : 'driving';

  const [navState, setNavState] = useState<'preview' | 'navigating' | 'arrived'>('preview');
  const [muted, setMuted] = useState(false);
  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [distanceToManeuver, setDistanceToManeuver] = useState<number | null>(null);

  const isFollowingRef = useRef(isFollowing);
  isFollowingRef.current = isFollowing;
  const navStateRef = useRef(navState);
  navStateRef.current = navState;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const stepsRef = useRef<RouteStep[]>(steps);
  stepsRef.current = steps;
  const stepIndexRef = useRef(stepIndex);
  stepIndexRef.current = stepIndex;

  const lastBearingRef = useRef(OVERVIEW_BEARING);
  const lastFetchCoordsRef = useRef<LatLng | null>(null);
  const lastFetchModeRef = useRef<TravelMode | null>(null);
  const lastRerouteAtRef = useRef(0);
  const lastSpokenRef = useRef<{ stepIndex: number; near: boolean }>({ stepIndex: -1, near: false });
  const bannerAnim = useRef(new Animated.Value(1)).current;

  // Advances the current step / fires voice cues as the user physically
  // approaches each maneuver. Reads mutable state via refs (not closed-over
  // state) because it runs inside a GPS subscription callback set up once.
  const handleNavigationTick = (coords: LatLng): number | null => {
    const currentSteps = stepsRef.current;
    const idx = stepIndexRef.current;
    if (!currentSteps.length || idx >= currentSteps.length) return null;
    const step = currentSteps[idx];
    const dist = haversineMeters(coords, step.location);
    setDistanceToManeuver(dist);

    const isLastStep = idx === currentSteps.length - 1;
    if (isLastStep) {
      if (dist < ARRIVE_METERS) {
        if (navStateRef.current !== 'arrived') {
          setNavState('arrived');
          if (!mutedRef.current) speak('Llegaste a destino');
        }
      } else if (lastSpokenRef.current.stepIndex !== idx) {
        if (!mutedRef.current) speak(`${speakDistancePrefix(dist)}, ${step.instruction}`);
        lastSpokenRef.current = { stepIndex: idx, near: false };
      } else if (dist < NEAR_MANEUVER_METERS && !lastSpokenRef.current.near) {
        if (!mutedRef.current) speak(step.instruction);
        lastSpokenRef.current = { stepIndex: idx, near: true };
      }
      return dist;
    }

    if (dist < ADVANCE_STEP_METERS) {
      setStepIndex(idx + 1);
      lastSpokenRef.current = { stepIndex: -1, near: false };
      return dist;
    }

    if (lastSpokenRef.current.stepIndex !== idx) {
      if (!mutedRef.current) speak(`${speakDistancePrefix(dist)}, ${step.instruction}`);
      lastSpokenRef.current = { stepIndex: idx, near: false };
    } else if (dist < NEAR_MANEUVER_METERS && !lastSpokenRef.current.near) {
      if (!mutedRef.current) speak(step.instruction);
      lastSpokenRef.current = { stepIndex: idx, near: true };
    }
    return dist;
  };

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

          let maneuverDist: number | null = null;
          if (navStateRef.current === 'navigating') {
            maneuverDist = handleNavigationTick(coords);
          }

          if (isFollowingRef.current) {
            const navigating = navStateRef.current === 'navigating';
            const zoom = navigating ? (maneuverDist != null && maneuverDist < 120 ? NAV_ZOOM_NEAR : NAV_ZOOM_FAR) : FOLLOW_ZOOM;
            const pitch = navigating ? NAV_PITCH : FOLLOW_PITCH;
            setViewState({ center: coords, zoom, pitch, bearing: lastBearingRef.current });
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [fallbackOrigin]);

  useEffect(() => stopSpeaking, []);

  useEffect(() => {
    if (navState !== 'navigating') return;
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [stepIndex, navState, bannerAnim]);

  const destLat = event?.exactLat ?? null;
  const destLng = event?.exactLng ?? null;

  useEffect(() => {
    if (!userCoords || !event?.exactAddress || destLat == null || destLng == null) return;
    const now = Date.now();
    const modeChanged = lastFetchModeRef.current !== osrmMode;

    if (directions && !modeChanged) {
      const existingRoute = decodePolyline(directions.polyline).map((p) => ({ lat: p.latitude, lng: p.longitude }));
      if (navState === 'navigating' && existingRoute.length > 1) {
        const { distanceMeters } = projectOntoPolyline(userCoords, existingRoute);
        const cooldownOk = now - lastRerouteAtRef.current > MIN_REROUTE_INTERVAL_MS;
        if (distanceMeters <= OFF_ROUTE_METERS || !cooldownOk) return;
      } else if (navState !== 'navigating') {
        const last = lastFetchCoordsRef.current;
        if (last && haversineMeters(last, userCoords) < REROUTE_THRESHOLD_METERS) return;
      }
    }

    lastFetchCoordsRef.current = userCoords;
    lastRerouteAtRef.current = now;
    lastFetchModeRef.current = osrmMode;
    setLoadingDirections(true);
    fetchDrivingDirections(userCoords.lat, userCoords.lng, destLat, destLng, osrmMode)
      .then((result) => {
        setDirections(result);
        setSteps(result?.steps ?? []);
        setStepIndex(0);
        lastSpokenRef.current = { stepIndex: -1, near: false };
      })
      .finally(() => setLoadingDirections(false));
  }, [userCoords, event?.exactAddress, destLat, destLng, osrmMode, navState]);

  const handleRecenter = () => {
    if (!userCoords) return;
    setIsFollowing(true);
    setViewState({ center: userCoords, zoom: navState === 'navigating' ? NAV_ZOOM_FAR : FOLLOW_ZOOM, pitch: navState === 'navigating' ? NAV_PITCH : FOLLOW_PITCH, bearing: lastBearingRef.current });
  };

  const handleStartNavigation = () => {
    if (!directions) return;
    setNavState('navigating');
    setIsFollowing(true);
    lastSpokenRef.current = { stepIndex: -1, near: false };
    if (!mutedRef.current) {
      const verb = travelOption === 'pie' ? 'Empezá a caminar' : 'Comenzando navegación';
      speak(`${verb}. ${directions.distanceText}, ${directions.durationText} aproximadamente.`);
    }
  };

  const handleExitNavigation = () => {
    stopSpeaking();
    setNavState('preview');
  };

  const handleToggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next) stopSpeaking();
      return next;
    });
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

  const fullRouteCoords = directions ? decodePolyline(directions.polyline).map((p) => ({ lat: p.latitude, lng: p.longitude })) : [];
  // While navigating, trim the already-traveled portion off the drawn line
  // so only the road ahead is highlighted — the classic GPS "eaten trail" look.
  const routeCoords =
    navState === 'navigating' && fullRouteCoords.length > 1
      ? fullRouteCoords.slice(projectOntoPolyline(userCoords, fullRouteCoords).segmentIndex)
      : fullRouteCoords;

  const view = viewState ?? { center: userCoords, zoom: FOLLOW_ZOOM, pitch: FOLLOW_PITCH, bearing: lastBearingRef.current };
  const mapMarkers: MapMarkerSpec[] = [
    { id: 'me', kind: 'dot', lat: userCoords.lat, lng: userCoords.lng, color: colors.accent, heading: heading ?? undefined },
    { id: 'dest', kind: 'dot', lat: event.exactLat!, lng: event.exactLng!, color: colors.textSecondary },
  ];

  const currentStep = navState === 'navigating' ? steps[stepIndex] : undefined;

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

        {navState === 'navigating' && currentStep && (
          <Animated.View
            style={[
              styles.instructionBanner,
              { opacity: bannerAnim, transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
            ]}
          >
            <View style={styles.instructionIconWrap}>
              <Ionicons
                name={maneuverIconName(currentStep.maneuverType) as any}
                size={26}
                color={colors.accentText}
                style={{ transform: [{ rotate: `${maneuverRotationDeg(currentStep.maneuverType, currentStep.maneuverModifier)}deg` }] }}
              />
            </View>
            <View style={styles.instructionTextWrap}>
              <Text style={styles.instructionDistance}>{distanceToManeuver != null ? formatMetersShort(distanceToManeuver) : ''}</Text>
              <Text style={styles.instructionText} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
            </View>
            <Pressable onPress={handleToggleMute} hitSlop={10} style={styles.muteButton}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color={colors.textPrimary} />
            </Pressable>
          </Animated.View>
        )}

        {navState === 'navigating' && (
          <Pressable style={styles.exitButton} onPress={handleExitNavigation} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </Pressable>
        )}

        {!isFollowing && navState !== 'arrived' && (
          <Pressable style={styles.recenterButton} onPress={handleRecenter}>
            <Ionicons name="locate" size={20} color={colors.accentText} />
          </Pressable>
        )}
      </View>

      {navState === 'arrived' ? (
        <View style={styles.panel}>
          <View style={styles.arrivedRow}>
            <Ionicons name="flag" size={22} color={colors.accent} />
            <Text style={styles.address}>¡Llegaste a destino!</Text>
          </View>
          <Button label="Volver al evento" onPress={() => router.replace(`/event/${event.id}`)} />
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.address}>{event.exactAddress}</Text>

          {navState === 'preview' && (
            <View style={styles.modeRow}>
              {TRAVEL_OPTIONS.map((opt) => {
                const active = travelOption === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.modeChip, active && styles.modeChipActive]}
                    onPress={() => setTravelOption(opt.key)}
                  >
                    {opt.key === 'auto' && <Ionicons name="car-outline" size={16} color={active ? colors.accentText : colors.textSecondary} />}
                    {opt.key === 'moto' && (
                      <MaterialCommunityIcons name="motorbike" size={16} color={active ? colors.accentText : colors.textSecondary} />
                    )}
                    {opt.key === 'pie' && <Ionicons name="walk-outline" size={16} color={active ? colors.accentText : colors.textSecondary} />}
                    <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {loadingDirections ? (
            <LoadingState />
          ) : directions ? (
            <View style={styles.etaRow}>
              <Ionicons
                name={travelOption === 'pie' ? 'walk-outline' : 'car-outline'}
                size={18}
                color={colors.accent}
              />
              <Text style={styles.etaText}>
                {directions.distanceText} · {directions.durationText}
                {navState === 'navigating' ? ' restantes' : travelOption === 'pie' ? ' caminando' : travelOption === 'moto' ? ' en moto' : ' en auto'}
              </Text>
            </View>
          ) : (
            <Text style={styles.hint}>No pudimos calcular la ruta ahora, pero podés abrir la navegación completa igual.</Text>
          )}

          {navState === 'preview' && (
            <>
              <Button
                label="Iniciar navegación"
                onPress={handleStartNavigation}
                disabled={!directions}
                icon={<Ionicons name="navigate" size={18} color={colors.accentText} />}
              />
              <Button label="Abrir en Google Maps" variant="ghost" onPress={openInExternalMaps} fullWidth={false} />
            </>
          )}
        </View>
      )}
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
  exitButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  instructionBanner: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg + 44,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  instructionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionTextWrap: { flex: 1 },
  instructionDistance: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.bold },
  instructionText: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  muteButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  panel: { padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  address: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  modeRow: { flexDirection: 'row', gap: spacing.xs },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
  modeChipActive: { backgroundColor: colors.accent },
  modeChipText: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  modeChipTextActive: { color: colors.accentText },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  etaText: { color: colors.textSecondary, fontSize: typography.size.md },
  hint: { color: colors.textMuted, fontSize: typography.size.xs, lineHeight: 16 },
  arrivedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
