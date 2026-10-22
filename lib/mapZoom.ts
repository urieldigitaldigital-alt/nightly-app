/** Converts a react-native-maps-style lat/lng delta (degrees of latitude
 * visible on screen) into an approximate Leaflet integer zoom level, so the
 * existing radius/delta math at each call site didn't need to be redone. */
export function latLngDeltaToZoom(delta: number): number {
  const zoom = Math.log2(360 / delta) - 1;
  return Math.max(2, Math.min(18, Math.round(zoom)));
}

export function radiusKmToZoom(radiusKm: number): number {
  return latLngDeltaToZoom(radiusKm / 55);
}
