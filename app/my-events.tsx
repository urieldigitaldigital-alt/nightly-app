import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useMyEvents } from '@/hooks/useMyEvents';
import { formatEventDateTime } from '@/lib/format';

const STATUS_LABEL: Record<string, { label: string; tone: 'neutral' | 'accent' | 'warning' | 'danger' }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  pending_review: { label: 'En revisión', tone: 'warning' },
  published: { label: 'Publicada', tone: 'accent' },
  full: { label: 'Completa', tone: 'warning' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
  finished: { label: 'Finalizada', tone: 'neutral' },
};

export default function MyEventsScreen() {
  const router = useRouter();
  const myEvents = useMyEvents();

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Mis fiestas</Text>
        <Pressable onPress={() => router.push('/event/create')} hitSlop={10}>
          <Ionicons name="add" size={24} color={colors.accent} />
        </Pressable>
      </View>

      {myEvents.isLoading ? (
        <LoadingState />
      ) : !myEvents.data || myEvents.data.length === 0 ? (
        <EmptyState title="Todavía no publicaste nada" description="Publicá tu primera fiesta para empezar a recibir solicitudes." actionLabel="Publicar fiesta" onAction={() => router.push('/event/create')} />
      ) : (
        <FlatList
          data={myEvents.data}
          keyExtractor={(e) => e.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => {
            const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.draft;
            return (
              <View style={styles.card}>
                <Pressable onPress={() => router.push(`/event/${item.id}`)}>
                  <View style={styles.cardTop}>
                    <Text style={styles.eventTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Badge label={status.label} tone={status.tone} />
                  </View>
                  <Text style={styles.eventMeta}>{formatEventDateTime(item.starts_at)}</Text>
                </Pressable>
                <View style={styles.cardActions}>
                  <Pressable style={styles.actionButton} onPress={() => router.push(`/event/${item.id}/requests`)}>
                    <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.actionLabel}>Solicitudes</Text>
                  </Pressable>
                  <Pressable style={styles.actionButton} onPress={() => router.push(`/event/${item.id}/attendees`)}>
                    <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.actionLabel}>Asistentes</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  eventTitle: { flex: 1, color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  eventMeta: { color: colors.textMuted, fontSize: typography.size.xs },
  cardActions: { flexDirection: 'row', gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionLabel: { color: colors.textSecondary, fontSize: typography.size.xs, fontWeight: typography.weight.medium },
});
