import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { updatePassword } from '@/services/auth';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
    } catch (e: any) {
      setError('No pudimos actualizar tu contraseña. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Screen edges={['top', 'bottom']} padded>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.title}>Contraseña actualizada</Text>
          <Text style={styles.subtitle}>Ya podés usar tu nueva contraseña la próxima vez que inicies sesión.</Text>
          <Button label="Listo" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Cambiar contraseña</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.subtitle}>Elegí una contraseña nueva de al menos 8 caracteres.</Text>

      <View style={styles.form}>
        <Input label="Nueva contraseña" secureTextEntry value={password} onChangeText={setPassword} />
        <Input label="Repetir contraseña" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Guardar contraseña" onPress={handleSubmit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl, textAlign: 'center' },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: typography.size.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
});
