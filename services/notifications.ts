import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AppNotification } from '@/types/models';

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, is_read, created_at, data')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type as AppNotification['type'],
    title: row.title,
    body: row.body,
    isRead: row.is_read,
    createdAt: row.created_at,
    data: (row.data as Record<string, unknown>) ?? {},
  }));
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('profile_id', user.id).eq('is_read', false);
  if (error) throw error;
}

export function subscribeToMyNotifications(profileId: string, onInsert: (n: AppNotification) => void): RealtimeChannel {
  return supabase
    .channel(`notifications:${profileId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` },
      (payload) => {
        const row = payload.new as any;
        onInsert({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          isRead: row.is_read,
          createdAt: row.created_at,
          data: row.data ?? {},
        });
      }
    )
    .subscribe();
}

export async function registerPushToken(expoPushToken: string, platform: 'ios' | 'android' | 'web') {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('device_tokens')
    .upsert({ profile_id: user.id, expo_push_token: expoPushToken, platform }, { onConflict: 'expo_push_token' });

  if (error) throw error;
}
