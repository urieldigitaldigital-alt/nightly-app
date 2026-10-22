import { supabase } from '@/lib/supabase';

export async function fetchPendingReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, details, status, created_at, reporter:profiles!reports_reporter_id_fkey(username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

type AdminAction =
  | { type: 'resolve_report'; reportId: string; resolution: 'actioned' | 'dismissed' }
  | { type: 'suspend_user'; userId: string }
  | { type: 'verify_organizer'; userId: string; verified: boolean }
  | { type: 'cancel_event'; eventId: string };

export async function runAdminAction(action: AdminAction) {
  const { data, error } = await supabase.functions.invoke('admin-moderate', { body: action });
  if (error) throw error;
  return data;
}
