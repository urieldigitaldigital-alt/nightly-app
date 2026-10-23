import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { checkInAttendee, CheckedInAttendee } from '@/services/requests';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckedInAttendee | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const attendee = await checkInAttendee(id, code.trim());
      setResult(attendee);
      setCode('');
    } catch (e: any) {
      setError(translateCheckInError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Verificar entrada</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Pedile el código al asistente y escribilo acá para confirmar su entrada.</Text>

      <View style={styles.form}>
        <Input
          label="Código de entrada"
          placeholder="Ej: A1B2C3D4"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        <Button label="Verificar" onPress={handleVerify} loading={loading} />
      </View>

      {error ? (
        <View style={styles.resultBox}>
          <Ionicons name="close-circle" size={32} color={colors.danger} />
          <Text style={styles.resultError}>{error}</Text>
        </View>
      ) : null}

      {result ? (
        <View style={styles.resultBox}>
          <Ionicons name="checkmark-circle" size={32} color={colors.success} />
          <Avatar uri={result.profile.avatarUrl} name={result.profile.displayName} size={56} />
          <Text style={styles.resultName}>{result.profile.displayName}</Text>
          <Text style={styles.resultUsername}>@{result.profile.username}</Text>
          <Text style={styles.resultConfirmed}>Entrada confirmada</Text>
        </View>
      ) : null}
    </Screen>
  );
}

function translateCheckInError(message?: string): string {
  if (!message) return 'No pudimos verificar el código. Probá de nuevo.';
  if (message.includes('INVALID_CODE')) return 'Ese código no existe para esta fiesta.';
  if (message.includes('ALREADY_CHECKED_IN')) return 'Esa persona ya entró antes.';
  if (message.includes('ATTENDANCE_CANCELLED')) return 'Esa persona canceló su asistencia.';
  if (message.includes('NOT_AUTHORIZED')) return 'No tenés permiso para verificar entradas en esta fiesta.';
  return message;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginBottom: spacing.lg },
  form: { gap: spacing.md },
  resultBox: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  resultError: { color: colors.danger, fontSize: typography.size.md, textAlign: 'center' },
  resultName: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  resultUsername: { color: colors.textMuted, fontSize: typography.size.sm },
  resultConfirmed: { color: colors.success, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.xs },
});
