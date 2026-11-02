import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getChatImageUrls } from '@/services/storage';
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
       last_message:messages(id, body, image_path, created_at, sender_id)`
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
      lastMessage: last ? { body: last.body, imagePath: last.image_path, createdAt: last.created_at, senderId: last.sender_id } : null,
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
    .select('id, conversation_id, sender_id, body, image_path, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = data ?? [];
  const imagePaths = rows.map((r) => r.image_path).filter((p): p is string => Boolean(p));
  const urlByPath = await getChatImageUrls(imagePaths);

  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    imagePath: row.image_path,
    imageUrl: row.image_path ? urlByPath[row.image_path] ?? null : null,
    createdAt: row.created_at,
    status: 'sent',
  }));
}

export async function sendMessage(conversationId: string, body: string | null, imagePath?: string | null) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('NOT_AUTHENTICATED');

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: body || null, image_path: imagePath || null })
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

/** One channel per conversation carries both the postgres INSERT feed for
 * new messages and an ephemeral (never persisted) broadcast event for the
 * "escribiendo..." indicator — Supabase channels support mixing listener
 * types on the same subscription, so there's no need for two sockets. */
export function subscribeToConversation(
  conversationId: string,
  handlers: { onInsert: (message: Message) => void; onTyping?: (profileId: string) => void }
): RealtimeChannel {
  return supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        const row = payload.new as any;
        const imageUrl = row.image_path ? await getChatImageUrls([row.image_path]).then((m) => m[row.image_path] ?? null) : null;
        handlers.onInsert({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          body: row.body,
          imagePath: row.image_path,
          imageUrl,
          createdAt: row.created_at,
          status: 'sent',
        });
      }
    )
    .on('broadcast', { event: 'typing' }, (payload) => {
      const profileId = (payload.payload as any)?.profileId;
      if (profileId) handlers.onTyping?.(profileId);
    })
    .subscribe();
}

export function broadcastTyping(channel: RealtimeChannel, profileId: string) {
  channel.send({ type: 'broadcast', event: 'typing', payload: { profileId } });
}

/** Every other member's last_read_at for this conversation — used to derive
 * a WhatsApp-style read tick client-side (a message is "read" once it's
 * older than every other member's last_read_at) instead of tracking a
 * read/unread flag per message per recipient, which conversation_members
 * already gives us for free. */
export async function fetchOtherMembersLastRead(conversationId: string): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('conversation_members')
    .select('profile_id, last_read_at')
    .eq('conversation_id', conversationId)
    .is('left_at', null);

  if (error) throw error;
  return (data ?? []).filter((m) => m.profile_id !== user?.id).map((m) => m.last_read_at as string);
}

export function subscribeToConversationMembers(conversationId: string, onChange: () => void): RealtimeChannel {
  return supabase
    .channel(`conversation-members:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'conversation_members', filter: `conversation_id=eq.${conversationId}` },
      onChange
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
