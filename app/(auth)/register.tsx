import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';
import { userFacingError } from '@/lib/errors';
import { isUsernameAvailable, signUp } from '@/services/auth';

const USERNAME_FORMAT = /^[a-z0-9_.]{3,24}$/;

/** Espera entre que dejás de tipear y la consulta, para no pegarle a la base por cada tecla. */
const USERNAME_CHECK_DELAY_MS = 450;

type UsernameState = { status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'; message?: string };

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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Aceptación separada de la de los Términos, y no una sola casilla que
  // junte todo: la Guideline 1.2 de Apple pide que la persona acepte de forma
  // explícita que no hay tolerancia con el contenido objetable ni con los
  // usuarios abusivos. Enterrarlo dentro de "acepto los términos" no cuenta.
  const [acceptedConduct, setAcceptedConduct] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>({ status: 'idle' });

  // Comprobación mientras escribe, con una espera para no consultar en cada
  // tecla. Enterarse de que el nombre está ocupado recién al tocar "Crear
  // cuenta" — con el formulario entero ya completo — es la peor versión de
  // este error.
  useEffect(() => {
    const candidate = username.trim().toLowerCase();

    if (!candidate) {
      setUsernameState({ status: 'idle' });
      return;
    }
    if (!USERNAME_FORMAT.test(candidate)) {
      setUsernameState({
        status: 'invalid',
        message: 'Solo minúsculas, números, puntos y guiones bajos (3 a 24 caracteres).',
      });
      return;
    }

    setUsernameState({ status: 'checking' });

    let cancelled = false;
    const timer = setTimeout(async () => {
      const available = await isUsernameAvailable(candidate);
      // Si el texto cambió mientras la consulta viajaba, la respuesta ya no
      // corresponde a lo que hay en pantalla.
      if (cancelled) return;
      setUsernameState(
        available
          ? { status: 'available', message: `@${candidate} está disponible` }
          : { status: 'taken', message: `@${candidate} ya está en uso. Probá con otro.` }
      );
    }, USERNAME_CHECK_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const handleSubmit = async () => {
    setError(null);

    if (!email || !password || !username || !displayName) {
      setError('Completá todos los campos.');
      return;
    }
    if (!acceptedTerms) {
      setError('Tenés que aceptar los Términos de uso y la Política de privacidad para continuar.');
      return;
    }
    if (!acceptedConduct) {
      setError('Tenés que aceptar las Normas de la comunidad para continuar.');
      return;
    }
    if (!USERNAME_FORMAT.test(username)) {
      setError('El usuario solo puede tener minúsculas, números, puntos y guiones bajos (3-24 caracteres).');
      return;
    }
    if (usernameState.status === 'taken') {
      setError(`El usuario @${username.trim().toLowerCase()} ya está en uso. Elegí otro.`);
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!isAdult(day, month, year)) {
      setError('Afterdune es para mayores de 18 años. Revisá tu fecha de nacimiento.');
      return;
    }

    const birthdate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    setLoading(true);
    try {
      const { session } = await signUp({ email, password, username, displayName, birthdate });
      if (session) {
        router.replace('/(auth)/onboarding-profile');
      } else {
        // No session back yet means Supabase's "Confirm email" requirement
        // is on — signUp() already sent the code, this just takes them to
        // enter it.
        router.push({ pathname: '/(auth)/verify-email', params: { email } });
      }
    } catch (e: unknown) {
      setError(userFacingError(e, 'No pudimos crear tu cuenta. Probá de nuevo.'));
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
          <View>
            <Input
              label="Usuario"
              placeholder="tu_usuario"
              autoCapitalize="none"
              autoCorrect={false}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase())}
            />
            {usernameState.status !== 'idle' && (
              <View style={styles.usernameStatus}>
                {usernameState.status === 'checking' ? (
                  <>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={styles.usernameChecking}>Verificando...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name={usernameState.status === 'available' ? 'checkmark-circle' : 'close-circle'}
                      size={15}
                      color={usernameState.status === 'available' ? colors.success : colors.danger}
                    />
                    <Text style={usernameState.status === 'available' ? styles.usernameOk : styles.usernameBad}>{usernameState.message}</Text>
                  </>
                )}
              </View>
            )}
          </View>
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
            <Text style={styles.hint}>Tenés que ser mayor de 18 años para usar Afterdune.</Text>
          </View>

          <Pressable style={styles.confirmRow} onPress={() => setAcceptedTerms((v) => !v)}>
            <Ionicons name={acceptedTerms ? 'checkbox' : 'square-outline'} size={22} color={acceptedTerms ? colors.accent : colors.textMuted} />
            <Text style={styles.confirmText}>
              Acepto los{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(brand.termsUrl)}>
                Términos de uso
              </Text>{' '}
              y la{' '}
              <Text style={styles.link} onPress={() => Linking.openURL(brand.privacyUrl)}>
                Política de privacidad
              </Text>{' '}
              de {brand.name}.
            </Text>
          </Pressable>

          <Pressable style={styles.confirmRow} onPress={() => setAcceptedConduct((v) => !v)}>
            <Ionicons
              name={acceptedConduct ? 'checkbox' : 'square-outline'}
              size={22}
              color={acceptedConduct ? colors.accent : colors.textMuted}
            />
            <Text style={styles.confirmText}>
              Entiendo que {brand.name} tiene <Text style={styles.strong}>tolerancia cero</Text> con el contenido objetable y los usuarios
              abusivos, y acepto las{' '}
              <Text style={styles.link} onPress={() => router.push('/community-guidelines')}>
                Normas de la comunidad
              </Text>
              .
            </Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button label="Crear cuenta" onPress={handleSubmit} loading={loading} disabled={!acceptedTerms || !acceptedConduct} />
        </View>
      </ScrollView>
    </Screen>
  );
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
  usernameStatus: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
  usernameChecking: { color: colors.textMuted, fontSize: typography.size.xs },
  usernameOk: { color: colors.success, fontSize: typography.size.xs, fontWeight: typography.weight.medium },
  usernameBad: { flex: 1, color: colors.danger, fontSize: typography.size.xs, fontWeight: typography.weight.medium },
  error: { color: colors.danger, fontSize: typography.size.sm },
  confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  confirmText: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 20 },
  link: { color: colors.accent, fontWeight: typography.weight.medium },
  strong: { color: colors.textPrimary, fontWeight: typography.weight.semibold },
});
