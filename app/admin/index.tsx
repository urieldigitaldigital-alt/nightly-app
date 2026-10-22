import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { fetchPendingReports, runAdminAction } from '@/services/admin';
import { formatRelativeShort } from '@/lib/format';

export default function AdminScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-reports'], queryFn: fetchPendingReports, enabled: profile?.role === 'admin' });

  if (profile?.role !== 'admin') {
    return (
      <Screen padded>
        <EmptyState icon={<Ionicons name="lock-closed-outline" size={36} color={colors.textMuted} />} title="Acceso restringido" description="Esta sección es solo para el equipo de NIGHTLY." actionLabel="Volver" onAction={() => router.back()} />
      </Screen>
    );
  }

  const resolve = async (reportId: string, resolution: 'actioned' | 'dismissed') => {
    await runAdminAction({ type: 'resolve_report', reportId, resolution });
    queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Panel administrativo</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionTitle}>Denuncias pendientes</Text>

      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="Sin denuncias pendientes" description="Todo al día." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(r: any) => r.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }: any) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <Badge label={item.target_type} tone="neutral" />
                <Text style={styles.time}>{formatRelativeShort(item.created_at)}</Text>
              </View>
              <Text style={styles.reason}>{item.reason}</Text>
              {item.details ? <Text style={styles.details}>{item.details}</Text> : null}
              <Text style={styles.reporter}>Denunciado por @{item.reporter?.username}</Text>
              <View style={styles.actions}>
                <Button label="Descartar" variant="outline" fullWidth={false} onPress={() => resolve(item.id, 'dismissed')} />
                <Button label="Tomar acción" variant="danger" fullWidth={false} onPress={() => resolve(item.id, 'actioned')} />
              </View>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.textMuted, fontSize: typography.size.xs },
  reason: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold, marginTop: 4 },
  details: { color: colors.textSecondary, fontSize: typography.size.sm },
  reporter: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
