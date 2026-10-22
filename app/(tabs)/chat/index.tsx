import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useConversations } from '@/hooks/useConversations';
import { formatRelativeShort } from '@/lib/format';
import { Conversation } from '@/types/models';

export default function ChatListScreen() {
  const router = useRouter();
  const { data, isLoading } = useConversations();

  return (
    <Screen edges={['top']} padded>
      <Text style={styles.title}>Chat</Text>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />}
          title="Todavía no tenés conversaciones"
          description="Cuando te acepten en una fiesta (o aceptes a alguien), el chat se abre automáticamente acá."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => <ConversationRow conversation={item} onPress={() => router.push(`/chat/${item.id}`)} />}
        />
      )}
    </Screen>
  );
}

function ConversationRow({ conversation, onPress }: { conversation: Conversation; onPress: () => void }) {
  const title = conversation.isGroup ? conversation.title ?? 'Chat grupal' : conversation.otherMember?.displayName ?? 'Usuario';

  return (
    <Pressable style={styles.row} onPress={onPress}>
      {conversation.isGroup ? (
        <View style={styles.groupIcon}>
          <Ionicons name="people" size={20} color={colors.accent} />
        </View>
      ) : (
        <Avatar uri={conversation.otherMember?.avatarUrl} name={title} size={48} />
      )}
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.name} numberOfLines={1}>
            {title}
          </Text>
          {conversation.lastMessage && <Text style={styles.time}>{formatRelativeShort(conversation.lastMessage.createdAt)}</Text>}
        </View>
        <View style={styles.rowBottom}>
          <Text style={[styles.lastMessage, conversation.unreadCount > 0 && styles.unreadText]} numberOfLines={1}>
            {conversation.lastMessage?.body ?? 'Sin mensajes todavía'}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{conversation.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginVertical: spacing.sm },
  separator: { height: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold, flex: 1 },
  time: { color: colors.textMuted, fontSize: typography.size.xs },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { color: colors.textMuted, fontSize: typography.size.sm, flex: 1 },
  unreadText: { color: colors.textPrimary, fontWeight: typography.weight.medium },
  unreadBadge: { backgroundColor: colors.accent, borderRadius: radii.pill, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  unreadCount: { color: colors.accentText, fontSize: 11, fontWeight: typography.weight.bold },
});
