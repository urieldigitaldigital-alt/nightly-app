import { supabase } from '@/lib/supabase';
import { EventAttendee } from '@/types/models';

export async function fetchAttendees(eventId: string): Promise<EventAttendee[]> {
  const { data, error } = await supabase
    .from('event_attendees')
    .select(
      `id, event_id, confirmed_at,
       profile:profiles!event_attendees_profile_id_fkey(id, username, display_name, avatar_url)`
    )
    .eq('event_id', eventId)
    .is('cancelled_at', null)
    .order('confirmed_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
    return {
      id: row.id,
      eventId: row.event_id,
      profile: {
        id: profile.id,
        displayName: profile.display_name,
        username: profile.username,
        avatarUrl: profile.avatar_url,
      },
      confirmedAt: row.confirmed_at,
    };
  });
}
