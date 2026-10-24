export type LatLng = { lat: number; lng: number };

/** Great-circle distance between two points, in meters. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Closest point on a polyline to `point`, as a straight-line (planar)
 * approximation — degrees converted to meters via a local scale factor
 * centered on `point`. Accurate to well under a meter of error at the
 * street-level distances turn-by-turn navigation cares about. Returns the
 * index of the segment's start point, so the caller can trim the polyline
 * to "remaining road ahead" by slicing from that index. */
export function projectOntoPolyline(point: LatLng, line: LatLng[]): { distanceMeters: number; segmentIndex: number } {
  if (line.length === 0) return { distanceMeters: Infinity, segmentIndex: 0 };
  if (line.length === 1) return { distanceMeters: haversineMeters(point, line[0]), segmentIndex: 0 };

  const latScale = 111320;
  const lngScale = 111320 * Math.cos((point.lat * Math.PI) / 180);
  const toXY = (p: LatLng) => ({ x: (p.lng - point.lng) * lngScale, y: (p.lat - point.lat) * latScale });

  let best = { distanceMeters: Infinity, segmentIndex: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const a = toXY(line[i]);
    const b = toXY(line[i + 1]);
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const lenSq = abx * abx + aby * aby;
    let t = lenSq > 0 ? (-a.x * abx + -a.y * aby) / lenSq : 0;
    t = Math.max(0, Math.min(1, t));
    const px = a.x + abx * t;
    const py = a.y + aby * t;
    const dist = Math.sqrt(px * px + py * py);
    if (dist < best.distanceMeters) best = { distanceMeters: dist, segmentIndex: i };
  }
  return best;
}
