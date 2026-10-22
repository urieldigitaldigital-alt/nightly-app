import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { signIn, signInWithGoogle } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError('No pudimos conectar con Google. Probá de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError('Ingresá tu email y contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // app/_layout.tsx's guard effect takes it from here (tabs vs onboarding).
    } catch (e: any) {
      setError(
        e?.message?.includes('Invalid login')
          ? 'Email o contraseña incorrectos. Si te registraste con Google, usá "Continuar con Google" en vez de contraseña.'
          : 'Algo salió mal. Probá de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} onPress={() => router.back()} />
      </View>

      <Text style={styles.title}>Bienvenido de nuevo</Text>
      <Text style={styles.subtitle}>Iniciá sesión para seguir descubriendo.</Text>

      <View style={styles.form}>
        <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Input label="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Iniciar sesión" onPress={handleSubmit} loading={loading} />

        <Text style={styles.link} onPress={() => router.push('/(auth)/forgot-password')}>
          ¿Olvidaste tu contraseña?
        </Text>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          label="Continuar con Google"
          variant="secondary"
          onPress={handleGoogle}
          loading={googleLoading}
          icon={<Ionicons name="logo-google" size={18} color={colors.textPrimary} />}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.size.display, fontWeight: typography.weight.bold, marginTop: spacing.lg },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: typography.size.sm },
  link: { color: colors.accent, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.sm, fontWeight: typography.weight.medium },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xxs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: typography.size.xs },
});
