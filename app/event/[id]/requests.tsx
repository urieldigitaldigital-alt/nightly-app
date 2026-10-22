import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReceivedRequests } from '@/hooks/useReceivedRequests';
import { acceptEventRequest, rejectEventRequest } from '@/services/requests';
import { formatRelativeShort } from '@/lib/format';
import { EventRequest } from '@/types/models';

const STATUS_COPY: Record<string, { label: string; tone: 'accent' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  accepted: { label: 'Aceptada', tone: 'accent' },
  rejected: { label: 'Rechazada', tone: 'danger' },
  waitlisted: { label: 'Lista de espera', tone: 'neutral' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

export default function EventRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useReceivedRequests(id);
  const [actingId, setActingId] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['received-requests', id] });
    queryClient.invalidateQueries({ queryKey: ['event-detail', id] });
  };

  const handleAccept = async (requestId: string) => {
    setActingId(requestId);
    try {
      await acceptEventRequest(requestId);
      invalidate();
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActingId(requestId);
    try {
      await rejectEventRequest(requestId);
      invalidate();
    } finally {
      setActingId(null);
    }
  };

  const pending = (requests ?? []).filter((r) => r.status === 'pending' || r.status === 'waitlisted');
  const decided = (requests ?? []).filter((r) => r.status !== 'pending' && r.status !== 'waitlisted');

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Solicitudes</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : !requests || requests.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="mail-open-outline" size={36} color={colors.textMuted} />}
          title="Sin solicitudes todavía"
          description="Cuando alguien pida asistir a tu fiesta, va a aparecer acá."
        />
      ) : (
        <FlatList
          data={[...pending, ...decided]}
          keyExtractor={(r) => r.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <RequestRow
              request={item}
              acting={actingId === item.id}
              onAccept={() => handleAccept(item.id)}
              onReject={() => handleReject(item.id)}
              onOpenProfile={() => router.push(`/profile/${item.requester.username}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function RequestRow({
  request,
  acting,
  onAccept,
  onReject,
  onOpenProfile,
}: {
  request: EventRequest;
  acting: boolean;
  onAccept: () => void;
  onReject: () => void;
  onOpenProfile: () => void;
}) {
  const status = STATUS_COPY[request.status];
  const isPending = request.status === 'pending' || request.status === 'waitlisted';

  return (
    <View style={styles.row}>
      <Pressable style={styles.rowInfo} onPress={onOpenProfile}>
        <Avatar uri={request.requester.avatarUrl} name={request.requester.displayName} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{request.requester.displayName}</Text>
          <Text style={styles.username}>@{request.requester.username}</Text>
          {request.message ? (
            <Text style={styles.message} numberOfLines={2}>
              "{request.message}"
            </Text>
          ) : null}
          <Text style={styles.time}>{formatRelativeShort(request.createdAt)}</Text>
        </View>
      </Pressable>

      {isPending ? (
        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, styles.reject]} onPress={onReject} disabled={acting}>
            <Ionicons name="close" size={20} color={colors.danger} />
          </Pressable>
          <Pressable style={[styles.actionButton, styles.accept]} onPress={onAccept} disabled={acting}>
            <Ionicons name="checkmark" size={20} color={colors.accentText} />
          </Pressable>
        </View>
      ) : (
        status && <Badge label={status.label} tone={status.tone} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  rowInfo: { flexDirection: 'row', gap: spacing.sm, flex: 1, alignItems: 'center' },
  name: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  username: { color: colors.textMuted, fontSize: typography.size.xs },
  message: { color: colors.textSecondary, fontSize: typography.size.xs, marginTop: 2, fontStyle: 'italic' },
  time: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  actionButton: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  reject: { backgroundColor: 'rgba(255,92,92,0.12)' },
  accept: { backgroundColor: colors.accent },
});
