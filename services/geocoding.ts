// Nominatim (OpenStreetMap's free geocoding API) — same no-API-key, free
// stack as the map tiles (OpenFreeMap) and driving directions (OSRM). Usage
// policy: https://operations.osmfoundation.org/policies/nominatim/ — max
// 1 request/sec, which is naturally satisfied here since this only ever
// fires on an explicit button tap, never per-keystroke.
export type GeocodeResult = { lat: number; lng: number; label: string };

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  if (!response.ok) return null;

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) return null;

  const first = results[0];
  const lat = parseFloat(first.lat);
  const lng = parseFloat(first.lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng, label: first.display_name as string };
}
