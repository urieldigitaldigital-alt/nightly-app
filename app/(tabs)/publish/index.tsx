import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useMyEvents } from '@/hooks/useMyEvents';
import { formatEventDateTime } from '@/lib/format';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'En revisión',
  published: 'Publicada',
  full: 'Completa',
  cancelled: 'Cancelada',
  finished: 'Finalizada',
};

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'warning' | 'danger'> = {
  draft: 'neutral',
  pending_review: 'warning',
  published: 'accent',
  full: 'warning',
  cancelled: 'danger',
  finished: 'neutral',
};

export default function PublishScreen() {
  const router = useRouter();
  const myEvents = useMyEvents();

  return (
    <Screen edges={['top']} padded>
      <Text style={styles.title}>Organizá</Text>
      <Text style={styles.subtitle}>Publicá una fiesta o gestioná las que ya tenés en pie.</Text>

      <Button label="Publicar fiesta" size="lg" icon={<Ionicons name="add-circle" size={20} color={colors.accentText} />} onPress={() => router.push('/event/create')} />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis fiestas</Text>
        <Pressable onPress={() => router.push('/my-events')}>
          <Text style={styles.seeAll}>Ver todas</Text>
        </Pressable>
      </View>

      {myEvents.isLoading ? (
        <LoadingState />
      ) : !myEvents.data || myEvents.data.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="sparkles-outline" size={36} color={colors.textMuted} />}
          title="Todavía no publicaste nada"
          description="Cuando publiques tu primera fiesta vas a poder gestionar solicitudes y asistentes desde acá."
        />
      ) : (
        <FlatList
          data={myEvents.data.slice(0, 5)}
          keyExtractor={(e) => e.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <Pressable style={styles.eventRow} onPress={() => router.push(`/event/${item.id}`)}>
              <View style={styles.eventRowInfo}>
                <Text style={styles.eventTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.eventMeta}>{formatEventDateTime(item.starts_at)}</Text>
              </View>
              <Badge label={STATUS_LABEL[item.status] ?? item.status} tone={STATUS_TONE[item.status] ?? 'neutral'} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.sm },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.semibold },
  seeAll: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  eventRowInfo: { flex: 1, gap: 2, marginRight: spacing.sm },
  eventTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  eventMeta: { color: colors.textMuted, fontSize: typography.size.xs },
});
