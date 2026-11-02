import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type LiveLocation = {
  profileId: string;
  lat: number;
  lng: number;
  heading: number | null;
  updatedAt: string;
};

/** Called repeatedly (throttled) while a guest is actively navigating and
 * opted in to sharing — upsert keyed on (event_id, profile_id) so it's
 * always just one row per guest per event. */
export async function upsertMyLiveLocation(eventId: string, lat: number, lng: number, heading: number | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('live_locations')
    .upsert({ event_id: eventId, profile_id: user.id, lat, lng, heading, updated_at: new Date().toISOString() });
}

/** Called on arrival, on cancelling navigation, or when leaving the
 * directions screen — stops sharing immediately rather than waiting for
 * the stale-row cron to eventually clean it up. */
export async function clearMyLiveLocation(eventId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('live_locations').delete().eq('event_id', eventId).eq('profile_id', user.id);
}

/** Organizer-side: current live locations for an event (RLS already
 * restricts this to the event's own organizer, or a guest reading their
 * own row). */
export async function fetchEventLiveLocations(eventId: string): Promise<LiveLocation[]> {
  const { data, error } = await supabase.from('live_locations').select('profile_id, lat, lng, heading, updated_at').eq('event_id', eventId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    profileId: row.profile_id,
    lat: row.lat,
    lng: row.lng,
    heading: row.heading,
    updatedAt: row.updated_at,
  }));
}

export function subscribeToEventLiveLocations(eventId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`live-locations:${eventId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations', filter: `event_id=eq.${eventId}` }, onChange)
    .subscribe();
}
