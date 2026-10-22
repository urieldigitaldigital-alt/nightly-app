const DIRECTIONS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_DIRECTIONS_API_KEY;

export const isDirectionsApiConfigured = Boolean(DIRECTIONS_API_KEY);

export type DirectionsResult = {
  distanceText: string;
  durationText: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
};

/** Real driving directions via Google's Directions API. Returns null (never
 * a fabricated route) when no API key is configured — callers should fall
 * back to handing off to the native maps app instead of drawing a fake line. */
export async function fetchDrivingDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<DirectionsResult | null> {
  if (!DIRECTIONS_API_KEY) return null;

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLng}&destination=${destLat},${destLng}` +
    `&mode=driving&key=${DIRECTIONS_API_KEY}`;

  const response = await fetch(url);
  const json = await response.json();

  if (json.status !== 'OK' || !json.routes?.[0]) return null;

  const route = json.routes[0];
  const leg = route.legs[0];

  return {
    distanceText: leg.distance.text,
    durationText: leg.duration.text,
    distanceMeters: leg.distance.value,
    durationSeconds: leg.duration.value,
    polyline: route.overview_polyline.points,
  };
}
