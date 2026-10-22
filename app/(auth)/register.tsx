import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { signUp } from '@/services/auth';

function isAdult(day: string, month: string, year: string): boolean {
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (!d || !m || !y || y < 1900) return false;
  const birthdate = new Date(y, m - 1, d);
  const eighteenYearsAgo = new Date();
  eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
  return birthdate <= eighteenYearsAgo;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!email || !password || !username || !displayName) {
      setError('Completá todos los campos.');
      return;
    }
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
      setError('El usuario solo puede tener minúsculas, números, puntos y guiones bajos (3-24 caracteres).');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!isAdult(day, month, year)) {
      setError('NIGHTLY es para mayores de 18 años. Revisá tu fecha de nacimiento.');
      return;
    }

    const birthdate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    setLoading(true);
    try {
      await signUp({ email, password, username, displayName, birthdate });
      router.replace('/(auth)/onboarding-profile');
    } catch (e: any) {
      setError(translateAuthError(e?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} onPress={() => router.back()} />
        </View>

        <Text style={styles.title}>Creá tu cuenta</Text>
        <Text style={styles.subtitle}>Es gratis y te lleva un minuto.</Text>

        <View style={styles.form}>
          <Input label="Nombre para mostrar" placeholder="Cómo te ven los demás" value={displayName} onChangeText={setDisplayName} />
          <Input
            label="Usuario"
            placeholder="tu_usuario"
            autoCapitalize="none"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase())}
          />
          <Input
            label="Email"
            placeholder="vos@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input label="Contraseña" placeholder="Mínimo 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} />

          <View>
            <Text style={styles.label}>Fecha de nacimiento</Text>
            <View style={styles.dobRow}>
              <Input placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} style={styles.dobInput} />
              <Input placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} style={styles.dobInput} />
              <Input
                placeholder="AAAA"
                keyboardType="number-pad"
                maxLength={4}
                value={year}
                onChangeText={setYear}
                style={styles.dobInputYear}
              />
            </View>
            <Text style={styles.hint}>Tenés que ser mayor de 18 años para usar NIGHTLY.</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Crear cuenta" onPress={handleSubmit} loading={loading} />

          <Text style={styles.terms}>
            Al registrarte aceptás los Términos de uso y la Política de privacidad de NIGHTLY.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function translateAuthError(message?: string): string {
  if (!message) return 'Algo salió mal. Probá de nuevo.';
  if (message.includes('already registered')) return 'Ese email ya tiene una cuenta. Probá iniciar sesión.';
  if (message.includes('duplicate key') && message.includes('username')) return 'Ese usuario ya está en uso.';
  return message;
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.sm },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
    marginTop: spacing.xxs,
    marginBottom: spacing.xl,
  },
  form: { gap: spacing.md },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    marginBottom: spacing.xxs,
  },
  dobRow: { flexDirection: 'row', gap: spacing.xs },
  dobInput: { width: 64 },
  dobInputYear: { width: 90 },
  hint: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xxs },
  error: { color: colors.danger, fontSize: typography.size.sm },
  terms: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
