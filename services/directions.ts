export type TravelMode = 'driving' | 'walking';

export type RouteStep = {
  instruction: string;
  streetName: string;
  distanceMeters: number;
  maneuverType: string;
  maneuverModifier?: string;
  location: { lat: number; lng: number };
};

export type DirectionsResult = {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
  steps: RouteStep[];
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// Walking speed used to re-estimate duration when mode is 'walking' — OSRM's
// public demo server only actually has a driving profile compiled (verified:
// requesting /route/v1/walking/... still returns steps tagged
// `"mode":"driving"`), so the server-side duration is a driving estimate
// regardless of the URL. The geometry/streets are still a reasonable
// approximation for a pedestrian in these beach towns, just not the timing.
const WALK_SPEED_MPS = 1.3;

import { buildInstruction } from '@/lib/navigationInstructions';

/** Real directions via OSRM's free public routing server — no API key, no
 * billing account. It's a fair-use demo instance (not meant for heavy
 * production traffic), so if it's ever unreachable we return null and the
 * caller falls back to handing off to the device's own maps app instead of
 * drawing a fake route. `steps=true` additionally pulls turn-by-turn
 * maneuvers for voice-guided in-app navigation. */
export async function fetchDrivingDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: TravelMode = 'driving'
): Promise<DirectionsResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline&steps=true`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) return null;

    const route = json.routes[0];
    const durationSeconds = mode === 'walking' ? route.distance / WALK_SPEED_MPS : route.duration;

    const steps: RouteStep[] = (route.legs?.[0]?.steps ?? []).map((s: any) => ({
      instruction: buildInstruction(s.maneuver.type, s.maneuver.modifier, s.name ?? ''),
      streetName: s.name ?? '',
      distanceMeters: s.distance,
      maneuverType: s.maneuver.type,
      maneuverModifier: s.maneuver.modifier,
      location: { lat: s.maneuver.location[1], lng: s.maneuver.location[0] },
    }));

    return {
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(durationSeconds),
      distanceMeters: route.distance,
      durationSeconds,
      polyline: route.geometry,
      steps,
    };
  } catch {
    return null;
  }
}
