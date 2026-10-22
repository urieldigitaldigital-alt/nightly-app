import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { fetchMyRequests } from '@/services/requests';
import { formatEventDateTime } from '@/lib/format';

const STATUS_BADGE: Record<string, { label: string; tone: 'accent' | 'warning' | 'danger' | 'neutral' }> = {
  pending: { label: 'Pendiente', tone: 'warning' },
  accepted: { label: 'Confirmado', tone: 'accent' },
  rejected: { label: 'No aceptada', tone: 'danger' },
  waitlisted: { label: 'Lista de espera', tone: 'neutral' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
};

export default function MyPlansScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ['my-requests'], queryFn: fetchMyRequests });

  const sections = useMemo(() => {
    const rows = (data ?? []) as any[];
    const now = Date.now();
    const pending = rows.filter((r) => r.status === 'pending' || r.status === 'waitlisted');
    const upcoming = rows.filter((r) => r.status === 'accepted' && new Date(r.event?.starts_at ?? 0).getTime() >= now);
    const past = rows.filter(
      (r) => (r.status === 'accepted' && new Date(r.event?.starts_at ?? 0).getTime() < now) || r.event?.status === 'finished'
    );
    const other = rows.filter((r) => r.status === 'rejected' || r.status === 'cancelled');

    return [
      { title: 'Solicitudes pendientes', data: pending },
      { title: 'Próximos planes', data: upcoming },
      { title: 'Pasados', data: past },
      { title: 'Rechazados / cancelados', data: other },
    ].filter((s) => s.data.length > 0);
  }, [data]);

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Mis planes</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : sections.length === 0 ? (
        <EmptyState icon={<Ionicons name="calendar-outline" size={36} color={colors.textMuted} />} title="Sin planes todavía" description="Cuando solicités acceso a una fiesta, la vas a ver acá." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item: any) => item.id}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }: any) => {
            const badge = STATUS_BADGE[item.status];
            return (
              <Pressable style={styles.row} onPress={() => router.push(`/event/${item.event.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.event?.title}
                  </Text>
                  <Text style={styles.eventMeta}>{item.event?.starts_at ? formatEventDateTime(item.event.starts_at) : ''}</Text>
                </View>
                {badge && <Badge label={badge.label} tone={badge.tone} />}
              </Pressable>
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
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.md, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  eventTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  eventMeta: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 2 },
});
