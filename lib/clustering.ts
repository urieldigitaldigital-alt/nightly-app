import { EventSummary } from '@/types/models';

export type MarkerCluster = {
  key: string;
  lat: number;
  lng: number;
  events: EventSummary[];
};

/**
 * Groups events into grid cells so nearby markers don't overlap. Not a true
 * screen-space clustering algorithm (that would need the map's current zoom
 * level fed back from onRegionChange) — good enough at this scale, and a
 * reasonable place to swap in supercluster later if the event density grows.
 */
export function clusterEvents(events: EventSummary[], cellSizeDeg = 0.01): MarkerCluster[] {
  const cells = new Map<string, EventSummary[]>();

  for (const event of events) {
    const cellX = Math.round(event.lat / cellSizeDeg);
    const cellY = Math.round(event.lng / cellSizeDeg);
    const key = `${cellX}:${cellY}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(event);
    else cells.set(key, [event]);
  }

  return Array.from(cells.entries()).map(([key, bucketEvents]) => {
    const lat = bucketEvents.reduce((sum, e) => sum + e.lat, 0) / bucketEvents.length;
    const lng = bucketEvents.reduce((sum, e) => sum + e.lng, 0) / bucketEvents.length;
    return { key, lat, lng, events: bucketEvents };
  });
}
