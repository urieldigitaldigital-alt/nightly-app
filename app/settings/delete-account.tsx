import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { requestAccountDeletion, signOut } from '@/services/auth';

const CONFIRM_WORD = 'ELIMINAR';

const WHAT_GETS_DELETED = [
  'Tu perfil, foto y bio',
  'Las fiestas que publicaste',
  'Tus solicitudes y confirmaciones de asistencia',
  'Tus conversaciones y mensajes',
  'Fotos que subiste (perfil, eventos, DNI)',
  'Tu sesión y notificaciones push',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    if (!canConfirm || deleting) return;
    setError(null);
    setDeleting(true);
    try {
      await requestAccountDeletion();
      // The account is gone server-side; signOut() just clears the now-
      // dangling local session so app/_layout.tsx's guard sends us to
      // welcome instead of leaving the app stuck mid-screen.
      await signOut();
      router.replace('/(auth)/welcome');
    } catch (e: any) {
      setError('No pudimos eliminar tu cuenta. Probá de nuevo en unos minutos.');
      setDeleting(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Eliminar cuenta</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.warningBox}>
        <Ionicons name="warning" size={22} color={colors.danger} />
        <Text style={styles.warningText}>Esta acción es permanente y no se puede deshacer.</Text>
      </View>

      <Text style={styles.sectionTitle}>Esto se va a borrar:</Text>
      <View style={styles.list}>
        {WHAT_GETS_DELETED.map((item) => (
          <View key={item} style={styles.listRow}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        Para confirmar, escribí <Text style={styles.confirmWord}>{CONFIRM_WORD}</Text> abajo
      </Text>
      <Input autoCapitalize="characters" autoCorrect={false} value={confirmText} onChangeText={setConfirmText} placeholder={CONFIRM_WORD} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.submitSpacer}>
        <Button label="Eliminar mi cuenta para siempre" variant="danger" onPress={handleDelete} loading={deleting} disabled={!canConfirm} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  headerTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: { flex: 1, color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xs, marginTop: spacing.md },
  list: { gap: spacing.xs },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  listText: { color: colors.textSecondary, fontSize: typography.size.sm },
  confirmWord: { color: colors.danger, fontWeight: typography.weight.bold },
  error: { color: colors.danger, fontSize: typography.size.sm, marginTop: spacing.sm },
  submitSpacer: { marginTop: spacing.lg },
});
