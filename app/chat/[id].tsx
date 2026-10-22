import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  fetchConversationMeta,
  fetchMessages,
  markConversationRead,
  sendMessage,
  subscribeToConversationMessages,
  leaveConversation,
} from '@/services/chat';
import { blockUser, fileReport } from '@/services/reports';
import { useAuthStore } from '@/stores/authStore';
import { Message } from '@/types/models';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const listRef = useRef<FlatList>(null);

  const { data: meta } = useQuery({ queryKey: ['conversation-meta', id], queryFn: () => fetchConversationMeta(id), enabled: Boolean(id) });
  const { data: initialMessages, isLoading } = useQuery({ queryKey: ['messages', id], queryFn: () => fetchMessages(id), enabled: Boolean(id) });

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!id) return;
    markConversationRead(id).then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }));

    const channel = subscribeToConversationMessages(id, (message) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      markConversationRead(id);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [id, queryClient]);

  const handleSend = async () => {
    const body = input.trim();
    if (!body) return;
    setInput('');
    setSending(true);
    try {
      const sent = await sendMessage(id, body);
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, { id: sent.id, conversationId: id, senderId: sent.sender_id, body: sent.body, createdAt: sent.created_at, status: 'sent' }]));
    } finally {
      setSending(false);
    }
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
            {meta?.eventTitle ? (
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
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <MessageBubble message={item} isMine={item.senderId === profile?.id} />}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          />

          <View style={styles.inputBar}>
            <Input
              placeholder="Escribí un mensaje..."
              value={input}
              onChangeText={setInput}
              style={styles.input}
              multiline
              rightElement={
                <Pressable onPress={handleSend} disabled={sending || !input.trim()} hitSlop={8}>
                  <Ionicons name="send" size={20} color={input.trim() ? colors.accent : colors.textMuted} />
                </Pressable>
              }
            />
          </View>
        </KeyboardAvoidingView>
      )}

      <BottomSheetModal visible={optionsOpen} onClose={() => setOptionsOpen(false)}>
        {!meta?.isGroup && meta?.otherMember && (
          <>
            <OptionRow icon="person-outline" label="Ver perfil" onPress={() => router.push(`/profile/${meta.otherMember!.id}`)} />
            <OptionRow
              icon="flag-outline"
              label="Reportar"
              onPress={async () => {
                await fileReport('profile', meta.otherMember!.id, 'reported_from_chat');
                setOptionsOpen(false);
              }}
            />
            <OptionRow
              icon="ban-outline"
              label="Bloquear"
              danger
              onPress={async () => {
                await blockUser(meta.otherMember!.id);
                setOptionsOpen(false);
                router.back();
              }}
            />
          </>
        )}
        <OptionRow
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
    </Screen>
  );
}

function OptionRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable style={styles.optionRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textPrimary} />
      <Text style={[styles.optionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
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
  list: { padding: spacing.lg, gap: 2 },
  inputBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  input: { maxHeight: 100 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  optionLabel: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
});
