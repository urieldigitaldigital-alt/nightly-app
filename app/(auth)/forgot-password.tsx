import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { requestPasswordReset } from '@/services/auth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email) {
      setError('Ingresá tu email.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (e: any) {
      setError('No pudimos enviar el email. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} onPress={() => router.back()} />
      </View>

      <Text style={styles.title}>Recuperar contraseña</Text>
      <Text style={styles.subtitle}>Te mandamos un link para crear una nueva.</Text>

      {sent ? (
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.successText}>Revisá tu email ({email}) y seguí el link para restablecer tu contraseña.</Text>
          <Button label="Volver a iniciar sesión" variant="outline" onPress={() => router.replace('/(auth)/login')} />
        </View>
      ) : (
        <View style={styles.form}>
          <Input label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Enviar link" onPress={handleSubmit} loading={loading} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.sm },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.lg },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  error: { color: colors.danger, fontSize: typography.size.sm },
  success: { alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
  successText: { color: colors.textSecondary, textAlign: 'center', fontSize: typography.size.md, lineHeight: 22 },
});
