export type DirectionsResult = {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
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

/** Real driving directions via OSRM's free public routing server — no API
 * key, no billing account. It's a fair-use demo instance (not meant for
 * heavy production traffic), so if it's ever unreachable we return null and
 * the caller falls back to handing off to the device's own maps app instead
 * of drawing a fake route. */
export async function fetchDrivingDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=polyline`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.code !== 'Ok' || !json.routes?.[0]) return null;

    const route = json.routes[0];
    return {
      distanceText: formatDistance(route.distance),
      durationText: formatDuration(route.duration),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      polyline: route.geometry,
    };
  } catch {
    return null;
  }
}
