import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { listBlockedUsers, unblockUser } from '@/services/reports';

export default function PrivacyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['blocked-users'], queryFn: listBlockedUsers });

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Privacidad y seguridad</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.sectionTitle}>Cómo protegemos tus datos</Text>
      <View style={styles.infoCard}>
        <InfoRow text="La dirección exacta de una fiesta privada solo se muestra a quienes el organizador acepta." />
        <InfoRow text="Tu ubicación en tiempo real nunca se comparte con organizadores ni otros asistentes." />
        <InfoRow text="Podés usar NIGHTLY sin dar acceso permanente a tu ubicación." />
      </View>

      <Text style={styles.sectionTitle}>Usuarios bloqueados</Text>
      {isLoading ? (
        <LoadingState />
      ) : !data || data.length === 0 ? (
        <EmptyState title="No bloqueaste a nadie" description="" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p: any) => p.id}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }: any) => (
            <View style={styles.row}>
              <Avatar uri={item.avatar_url} name={item.display_name} size={36} />
              <Text style={styles.name}>{item.display_name}</Text>
              <Pressable
                style={styles.unblockButton}
                onPress={async () => {
                  await unblockUser(item.id);
                  queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
                }}
              >
                <Text style={styles.unblockText}>Desbloquear</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold, flex: 1, textAlign: 'center' },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.md, marginBottom: spacing.xs },
  infoCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  infoRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  infoText: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm },
  name: { flex: 1, color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
  unblockButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  unblockText: { color: colors.textPrimary, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
});
