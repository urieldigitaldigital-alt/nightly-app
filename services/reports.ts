import { supabase } from '@/lib/supabase';

export type ReportTargetType = 'event' | 'profile' | 'message';

export async function fileReport(targetType: ReportTargetType, targetId: string, reason: string, details?: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details });

  if (error) throw error;
}

export async function blockUser(blockedId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: blockedId });
  if (error) throw error;
}

export async function listBlockedUsers() {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id, profile:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => (Array.isArray(row.profile) ? row.profile[0] : row.profile));
}

export async function unblockUser(blockedId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { error } = await supabase.from('blocks').delete().eq('blocker_id', user.id).eq('blocked_id', blockedId);
  if (error) throw error;
}
