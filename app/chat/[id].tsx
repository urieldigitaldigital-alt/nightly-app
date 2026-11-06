import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { ImageViewerModal } from '@/components/ui/ImageViewerModal';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { SafetyOption, UserSafetySheet } from '@/components/safety/UserSafetySheet';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  broadcastTyping,
  fetchConversationMeta,
  fetchMessages,
  fetchOtherMembersLastRead,
  markConversationRead,
  subscribeToConversation,
  subscribeToConversationMembers,
  leaveConversation,
} from '@/services/chat';
import { ensurePhotoLibraryAccess } from '@/lib/permissions';
import { useAuthStore } from '@/stores/authStore';
import { useChatOutboxStore } from '@/stores/chatOutboxStore';
import { Message } from '@/types/models';

const TYPING_BROADCAST_THROTTLE_MS = 1500;
const TYPING_INDICATOR_TIMEOUT_MS = 3000;

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);

  const outboxMessages = useChatOutboxStore((s) => s.messages.filter((m) => m.conversationId === id));
  const enqueueOutbox = useChatOutboxStore((s) => s.enqueue);
  const retryOutbox = useChatOutboxStore((s) => s.retry);
  const discardOutbox = useChatOutboxStore((s) => s.discard);

  const { data: meta } = useQuery({ queryKey: ['conversation-meta', id], queryFn: () => fetchConversationMeta(id), enabled: Boolean(id) });
  const { data: initialMessages, isLoading } = useQuery({ queryKey: ['messages', id], queryFn: () => fetchMessages(id), enabled: Boolean(id) });

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  // Confirmed (DB) messages plus this device's own not-yet-confirmed sends —
  // the outbox store is the single source of truth for "sending"/"error"
  // bubbles, so there's nothing else to dedup here: once a queued message
  // actually lands, the realtime INSERT below adds the confirmed copy and
  // the store drops the queued one in the same breath.
  const displayMessages: Message[] = useMemo(() => {
    const queued: Message[] = outboxMessages.map((m) => ({
      id: m.localId,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      imagePath: null,
      imageUrl: m.imageLocalUri,
      createdAt: m.createdAt,
      status: m.status,
      rejectedReason: m.rejectedReason ?? null,
    }));
    return [...messages, ...queued].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, outboxMessages]);

  useEffect(() => {
    if (!id) return;
    markConversationRead(id).then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }));

    const channel = subscribeToConversation(id, {
      onInsert: (message) => {
        setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
        markConversationRead(id);
      },
      onTyping: (profileId) => {
        if (profileId === profile?.id) return;
        setOtherTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_INDICATOR_TIMEOUT_MS);
      },
    });
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [id, queryClient, profile?.id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const refresh = () => {
      fetchOtherMembersLastRead(id).then((rows) => {
        if (cancelled || rows.length === 0) return;
        setOtherReadAt(rows.reduce((a, b) => (a < b ? a : b)));
      });
    };
    refresh();
    const channel = subscribeToConversationMembers(id, refresh);

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [id]);

  const handleChangeInput = (text: string) => {
    setInput(text);
    const now = Date.now();
    if (channelRef.current && profile && text.length > 0 && now - lastTypingSentRef.current > TYPING_BROADCAST_THROTTLE_MS) {
      lastTypingSentRef.current = now;
      broadcastTyping(channelRef.current, profile.id);
    }
  };

  const handleSend = () => {
    const body = input.trim();
    if (!body || !profile || !id) return;
    setInput('');
    enqueueOutbox({
      localId: Crypto.randomUUID(),
      conversationId: id,
      senderId: profile.id,
      body,
      imageLocalUri: null,
      createdAt: new Date().toISOString(),
    });
  };

  const handlePickImage = async () => {
    if (!profile || !id) return;
    const granted = await ensurePhotoLibraryAccess();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;

    enqueueOutbox({
      localId: Crypto.randomUUID(),
      conversationId: id,
      senderId: profile.id,
      body: null,
      imageLocalUri: result.assets[0].uri,
      createdAt: new Date().toISOString(),
    });
  };

  const headerTitle = meta?.isGroup ? meta.title ?? 'Chat grupal' : meta?.otherMember?.displayName ?? 'Chat';

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Pressable
          style={styles.headerCenter}
          onPress={() => meta?.otherMember && router.push(`/profile/${meta.otherMember.id}`)}
        >
          {!meta?.isGroup && <Avatar uri={meta?.otherMember?.avatarUrl} name={headerTitle} size={32} />}
          <View>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {headerTitle}
            </Text>
            {otherTyping ? (
              <Text style={styles.headerTyping}>Escribiendo...</Text>
            ) : meta?.eventTitle ? (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {meta.eventTitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Pressable onPress={() => setOptionsOpen(true)} hitSlop={10}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState fullscreen />
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
          <FlatList
            ref={listRef}
            data={displayMessages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isMine = item.senderId === profile?.id;
              const effective: Message =
                isMine && item.status === 'sent' && otherReadAt && item.createdAt <= otherReadAt ? { ...item, status: 'read' } : item;
              return (
                <MessageBubble
                  message={effective}
                  isMine={isMine}
                  onImagePress={setViewerUri}
                  onRetry={() => retryOutbox(item.id)}
                  onDiscard={() => discardOutbox(item.id)}
                  // Denunciar el mensaje puntual y no solo a la persona:
                  // moderación necesita saber qué se dijo, no únicamente
                  // quién lo dijo. Solo sobre mensajes ajenos ya confirmados
                  // — uno propio o uno que todavía está en la cola de envío
                  // no tiene nada que denunciar.
                  onLongPress={
                    isMine || item.status === 'sending' || item.status === 'error' || item.status === 'rejected'
                      ? undefined
                      : () => setReportingMessageId(item.id)
                  }
                />
              );
            }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputBar}>
            <Pressable onPress={handlePickImage} hitSlop={8} style={styles.attachButton}>
              <Ionicons name="image-outline" size={24} color={colors.textSecondary} />
            </Pressable>
            <View style={styles.inputWrap}>
              <Input
                placeholder="Escribí un mensaje..."
                value={input}
                onChangeText={handleChangeInput}
                style={styles.input}
                multiline
                rightElement={
                  <Pressable onPress={handleSend} disabled={!input.trim()} hitSlop={8}>
                    <Ionicons name="send" size={20} color={input.trim() ? colors.accent : colors.textMuted} />
                  </Pressable>
                }
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      )}

      <ImageViewerModal visible={Boolean(viewerUri)} uri={viewerUri} onClose={() => setViewerUri(null)} />

      <BottomSheetModal visible={Boolean(reportingMessageId)} onClose={() => setReportingMessageId(null)}>
        <SafetyOption
          icon="flag-outline"
          label="Denunciar este mensaje"
          onPress={() => {
            const messageId = reportingMessageId;
            setReportingMessageId(null);
            router.push({ pathname: '/report', params: { targetType: 'message', targetId: messageId! } });
          }}
        />
      </BottomSheetModal>

      {/* El chat 1:1 usa la hoja compartida de seguridad (denunciar/bloquear
          con confirmación); el grupal no tiene una contraparte única a quien
          bloquear, así que ahí solo queda salir de la conversación. */}
      {!meta?.isGroup && meta?.otherMember ? (
        <UserSafetySheet
          visible={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          userId={meta.otherMember.id}
          displayName={meta.otherMember.displayName}
          onBlocked={() => router.back()}
        >
          <SafetyOption
            icon="person-outline"
            label="Ver perfil"
            onPress={() => {
              setOptionsOpen(false);
              router.push(`/profile/${meta.otherMember!.id}`);
            }}
          />
          <SafetyOption
            icon="exit-outline"
            label="Salir de la conversación"
            danger
            onPress={async () => {
              await leaveConversation(id);
              setOptionsOpen(false);
              router.back();
            }}
          />
        </UserSafetySheet>
      ) : (
        <BottomSheetModal visible={optionsOpen} onClose={() => setOptionsOpen(false)}>
          <SafetyOption
            icon="exit-outline"
            label="Salir de la conversación"
            danger
            onPress={async () => {
              await leaveConversation(id);
              setOptionsOpen(false);
              router.back();
            }}
          />
        </BottomSheetModal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.sm },
  headerTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  headerSubtitle: { color: colors.textMuted, fontSize: typography.size.xs },
  headerTyping: { color: colors.accent, fontSize: typography.size.xs, fontWeight: typography.weight.medium },
  list: { padding: spacing.lg, gap: 2 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  attachButton: { paddingBottom: spacing.sm + 2 },
  inputWrap: { flex: 1 },
  input: { maxHeight: 100 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  optionLabel: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
});
