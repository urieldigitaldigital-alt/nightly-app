// Assumed logical viewport width (css px) used to turn a "how many degrees
// should be visible" target into a standard web-mercator zoom level — zoom z
// shows a world 256*2^z px wide, so degrees-per-px = 360/(256*2^z).
const ASSUMED_VIEWPORT_PX = 420;

/** Converts a react-native-maps-style lat/lng delta (degrees that should be
 * visible edge-to-edge on screen) into the matching web-mercator zoom level. */
export function latLngDeltaToZoom(delta: number): number {
  const zoom = Math.log2((360 * ASSUMED_VIEWPORT_PX) / (256 * delta));
  return Math.max(2, Math.min(18, Math.round(zoom)));
}

export function radiusKmToZoom(radiusKm: number): number {
  const diameterDeg = (radiusKm * 2) / 111;
  return latLngDeltaToZoom(diameterDeg);
}
