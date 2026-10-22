import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { updatePassword } from '@/services/auth';
import { supabase } from '@/lib/supabase';

/**
 * Landing page for the "forgot password" email link. Supabase turns that
 * link into a short-lived authenticated (recovery) session automatically —
 * see detectSessionInUrl in lib/supabase.ts — so by the time this screen
 * mounts there's either a valid session to act on, or the link was invalid
 * / already used.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setCheckingSession(false);
    });
  }, []);

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
      setError('No pudimos actualizar tu contraseña. Pedí un nuevo link de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) return null;

  if (done) {
    return (
      <Screen edges={['top', 'bottom']} padded>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.title}>Contraseña actualizada</Text>
          <Text style={styles.subtitle}>Ya podés seguir usando NIGHTLY con tu nueva contraseña.</Text>
          <Button label="Ir a Descubrir" onPress={() => router.replace('/(tabs)/discover')} />
        </View>
      </Screen>
    );
  }

  if (!hasRecoverySession) {
    return (
      <Screen edges={['top', 'bottom']} padded>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.warning} />
          <Text style={styles.title}>Este link ya no es válido</Text>
          <Text style={styles.subtitle}>Los links de recuperación expiran o se usan una sola vez. Pedí uno nuevo.</Text>
          <Button label="Pedir un nuevo link" onPress={() => router.replace('/(auth)/forgot-password')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} padded>
      <Text style={styles.title}>Elegí tu nueva contraseña</Text>
      <Text style={styles.subtitle}>Tiene que tener al menos 8 caracteres.</Text>

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
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
    marginTop: spacing.xxs,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: typography.size.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
});
