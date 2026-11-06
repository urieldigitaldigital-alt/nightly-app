import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { colors, spacing, typography } from '@/constants/theme';
import { userFacingError } from '@/lib/errors';
import { signIn, signInWithApple, signInWithGoogle } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  // Un solo campo para las dos formas de entrar: pedirle a la gente que
  // elija primero "¿email o usuario?" es fricción sin información, porque la
  // presencia de una arroba ya lo dice.
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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

  const handleApple = async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      setError('No pudimos conectar con Apple. Probá de nuevo.');
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!identifier.trim() || !password) {
      setError('Ingresá tu email o usuario y tu contraseña.');
      return;
    }
    setLoading(true);
    try {
      await signIn(identifier, password);
      // app/_layout.tsx's guard effect takes it from here (tabs vs onboarding).
    } catch (e: any) {
      const message = String(e?.message ?? '');
      if (message.toLowerCase().includes('email not confirmed')) {
        // Solo se puede prellenar la pantalla de verificación si lo que
        // escribieron era un email; entrando con usuario, el email nunca
        // llega al cliente (ver la Edge Function `login`).
        router.push({ pathname: '/(auth)/verify-email', params: identifier.includes('@') ? { email: identifier.trim() } : {} });
        return;
      }
      setError(
        message.includes('Invalid login') || message.includes('incorrectos')
          ? 'Email, usuario o contraseña incorrectos. Si te registraste con Google, usá "Continuar con Google" en vez de contraseña.'
          : userFacingError(e, 'No pudimos iniciar sesión. Probá de nuevo.')
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
        <Input
          label="Email o usuario"
          placeholder="vos@email.com o tu_usuario"
          autoCapitalize="none"
          autoCorrect={false}
          // `email-address` fuerza un teclado con arroba y sin barra
          // espaciadora en iOS, que molesta al escribir un nombre de usuario.
          // `default` sirve para los dos casos.
          keyboardType="default"
          textContentType="username"
          value={identifier}
          onChangeText={setIdentifier}
        />
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
        <AppleSignInButton onPress={handleApple} loading={appleLoading} />
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
