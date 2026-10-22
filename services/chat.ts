import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Conversation, Message } from '@/types/models';

export async function fetchConversations(): Promise<Conversation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberships, error: membershipError } = await supabase
    .from('conversation_members')
    .select('conversation_id, last_read_at')
    .eq('profile_id', user.id)
    .is('left_at', null);

  if (membershipError) throw membershipError;
  if (!memberships || memberships.length === 0) return [];

  const conversationIds = memberships.map((m) => m.conversation_id);

  const { data: conversations, error } = await supabase
    .from('conversations')
    .select(
      `id, event_id, is_group, title,
       members:conversation_members(profile_id, profile:profiles(id, display_name, avatar_url)),
       last_message:messages(id, body, created_at, sender_id)`
    )
    .in('id', conversationIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const lastReadByConversation = new Map(memberships.map((m) => [m.conversation_id, m.last_read_at]));

  return (conversations ?? []).map((row: any) => {
    const lastMessages: any[] = Array.isArray(row.last_message) ? row.last_message : [];
    const sorted = [...lastMessages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const last = sorted[0] ?? null;
    const lastReadAt = lastReadByConversation.get(row.id);
    const unreadCount = lastReadAt
      ? sorted.filter((m) => new Date(m.created_at).getTime() > new Date(lastReadAt).getTime() && m.sender_id !== user.id).length
      : 0;

    const otherMemberRaw = !row.is_group
      ? row.members?.map((m: any) => m.profile).find((p: any) => p?.id && p.id !== user.id)
      : null;
    const otherMember = otherMemberRaw
      ? { id: otherMemberRaw.id, displayName: otherMemberRaw.display_name, avatarUrl: otherMemberRaw.avatar_url }
      : null;

    return {
      id: row.id,
      eventId: row.event_id,
      isGroup: row.is_group,
      title: row.title,
      lastMessage: last ? { body: last.body, createdAt: last.created_at, senderId: last.sender_id } : null,
      unreadCount,
      otherMember,
    } satisfies Conversation;
  });
}

export async function fetchConversationMeta(conversationId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('conversations')
    .select(
      `id, event_id, is_group, title,
       event:events(id, title),
       members:conversation_members(profile_id, profile:profiles(id, username, display_name, avatar_url))`
    )
    .eq('id', conversationId)
    .single();

  if (error) throw error;

  const row: any = data;
  const event = Array.isArray(row.event) ? row.event[0] : row.event;
  const otherMemberRaw = !row.is_group
    ? row.members?.map((m: any) => m.profile).find((p: any) => p?.id && p.id !== user?.id)
    : null;
  const otherMember = otherMemberRaw
    ? {
        id: otherMemberRaw.id,
        username: otherMemberRaw.username,
        displayName: otherMemberRaw.display_name,
        avatarUrl: otherMemberRaw.avatar_url,
      }
    : null;

  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: event?.title ?? null,
    isGroup: row.is_group,
    title: row.title,
    otherMember,
  };
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    status: 'sent',
  }));
}

export async function sendMessage(conversationId: string, body: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markConversationRead(conversationId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('conversation_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', user.id);

  if (error) throw error;
}

export function subscribeToConversationMessages(
  conversationId: string,
  onInsert: (message: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const row = payload.new as any;
        onInsert({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          createdAt: row.created_at,
          status: 'sent',
        });
      }
    )
    .subscribe();
}

export async function leaveConversation(conversationId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('conversation_members')
    .update({ left_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', user.id);

  if (error) throw error;
}
