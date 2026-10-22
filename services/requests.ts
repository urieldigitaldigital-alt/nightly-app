import { supabase } from '@/lib/supabase';
import { EventRequest } from '@/types/models';

export async function requestEventAccess(eventId: string, message?: string) {
  const { data, error } = await supabase.rpc('request_event_access', {
    p_event_id: eventId,
    p_message: message ?? null,
  });
  if (error) throw error;
  return data;
}

export async function acceptEventRequest(requestId: string) {
  const { data, error } = await supabase.rpc('accept_event_request', { p_request_id: requestId });
  if (error) throw error;
  return data;
}

export async function rejectEventRequest(requestId: string) {
  const { data, error } = await supabase.rpc('reject_event_request', { p_request_id: requestId });
  if (error) throw error;
  return data;
}

export async function inviteToEvent(eventId: string, profileId: string) {
  const { data, error } = await supabase.rpc('invite_to_event', { p_event_id: eventId, p_profile_id: profileId });
  if (error) throw error;
  return data;
}

export async function cancelAttendance(eventId: string) {
  const { error } = await supabase.rpc('cancel_attendance', { p_event_id: eventId });
  if (error) throw error;
}

export async function fetchReceivedRequests(eventId: string): Promise<EventRequest[]> {
  const { data, error } = await supabase
    .from('event_requests')
    .select(
      `id, event_id, status, message, created_at,
       requester:profiles!event_requests_requester_id_fkey(id, username, display_name, avatar_url)`
    )
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => {
    const requester = Array.isArray(row.requester) ? row.requester[0] : row.requester;
    return {
      id: row.id,
      eventId: row.event_id,
      requester: {
        id: requester.id,
        displayName: requester.display_name,
        username: requester.username,
        avatarUrl: requester.avatar_url,
      },
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
    };
  });
}

export async function fetchMyRequests() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase
    .from('event_requests')
    .select('id, status, created_at, event:events(id, title, cover_image_url, starts_at, status)')
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
