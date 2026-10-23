import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead, subscribeToMyNotifications } from '@/services/notifications';
import { useAuthStore } from '@/stores/authStore';
import { formatRelativeShort } from '@/lib/format';
import { AppNotification } from '@/types/models';

const ICON_BY_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  new_request: 'person-add-outline',
  request_accepted: 'checkmark-circle-outline',
  request_rejected: 'close-circle-outline',
  new_message: 'chatbubble-outline',
  event_invite: 'mail-outline',
  event_time_changed: 'time-outline',
  event_location_changed: 'location-outline',
  event_cancelled: 'warning-outline',
  event_upcoming: 'alarm-outline',
  capacity_changed: 'people-outline',
  event_nearby: 'compass-outline',
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });

  useEffect(() => {
    if (!profile) return;
    const channel = subscribeToMyNotifications(profile.id, () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => {
      channel.unsubscribe();
    };
  }, [profile, queryClient]);

  const handlePress = async (n: AppNotification) => {
    await markNotificationRead(n.id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    const conversationId = n.data?.conversation_id as string | undefined;
    const eventId = n.data?.event_id as string | undefined;
    if (conversationId) router.push(`/chat/${conversationId}`);
    // Go straight to the requests list, not the event page first — the
    // whole point of tapping this is to review/accept the request itself.
    else if (eventId && n.type === 'new_request') router.push(`/event/${eventId}/requests`);
    else if (eventId) router.push(`/event/${eventId}`);
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Notificaciones</Text>
        <Pressable
          onPress={async () => {
            await markAllNotificationsRead();
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
          }}
        >
          <Text style={styles.markAll}>Marcar todo</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={<Ionicons name="notifications-outline" size={36} color={colors.textMuted} />} title="Sin notificaciones" description="Te vamos a avisar acá sobre solicitudes, mensajes y novedades de tus fiestas." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Pressable style={[styles.row, !item.isRead && styles.rowUnread]} onPress={() => handlePress(item)}>
              <Ionicons name={ICON_BY_TYPE[item.type] ?? 'notifications-outline'} size={20} color={item.isRead ? colors.textMuted : colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{formatRelativeShort(item.createdAt)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  markAll: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  row: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
  rowUnread: { backgroundColor: colors.surfaceAlt },
  notifTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  notifBody: { color: colors.textSecondary, fontSize: typography.size.sm, marginTop: 2 },
  time: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 4 },
});
