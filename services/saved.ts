import { supabase } from '@/lib/supabase';
import { mapRadiusRowToSummary } from '@/lib/mappers';

export async function toggleSaveEvent(eventId: string, nextSaved: boolean) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  if (nextSaved) {
    const { error } = await supabase.from('saved_events').insert({ profile_id: user.id, event_id: eventId });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('saved_events').delete().eq('profile_id', user.id).eq('event_id', eventId);
    if (error) throw error;
  }
}

/** Saved events reuse the radius RPC (scoped to the user's current location)
 * and are then filtered down to the saved set, so cards show live distance,
 * capacity and status instead of a stale snapshot. */
export async function fetchSavedEventIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase.from('saved_events').select('event_id').eq('profile_id', user.id);
  if (error) throw error;
  return (data ?? []).map((row) => row.event_id);
}

export async function fetchSavedEventsNear(lat: number, lng: number) {
  const ids = await fetchSavedEventIds();
  if (ids.length === 0) return [];

  const { data, error } = await supabase.rpc('events_within_radius', {
    origin_lat: lat,
    origin_lng: lng,
    radius_km: 5000, // effectively unbounded — saved events can be far from "now"
    page_size: 100,
  });
  if (error) throw error;

  const idSet = new Set(ids);
  return (data ?? []).filter((row: { id: string }) => idSet.has(row.id)).map(mapRadiusRowToSummary);
}
