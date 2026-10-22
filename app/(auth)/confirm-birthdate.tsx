import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/constants/theme';
import { confirmBirthdate, signOut } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';

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

export default function ConfirmBirthdateScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!isAdult(day, month, year)) {
      setError('NIGHTLY es para mayores de 18 años. Revisá la fecha.');
      return;
    }

    const birthdate = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

    setLoading(true);
    try {
      await confirmBirthdate(birthdate);
      await refreshProfile();
      // app/_layout.tsx's guard takes it from here.
    } catch (e: any) {
      setError(e?.message?.includes('MUST_BE_ADULT') ? 'Tenés que ser mayor de 18 años para usar NIGHTLY.' : 'No pudimos guardar tu fecha de nacimiento. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <Text style={styles.title}>Un último paso</Text>
      <Text style={styles.subtitle}>
        Google no nos comparte tu fecha de nacimiento, y NIGHTLY es solo para mayores de 18. Completala para seguir.
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Fecha de nacimiento</Text>
        <View style={styles.dobRow}>
          <Input placeholder="DD" keyboardType="number-pad" maxLength={2} value={day} onChangeText={setDay} style={styles.dobInput} />
          <Input placeholder="MM" keyboardType="number-pad" maxLength={2} value={month} onChangeText={setMonth} style={styles.dobInput} />
          <Input placeholder="AAAA" keyboardType="number-pad" maxLength={4} value={year} onChangeText={setYear} style={styles.dobInputYear} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button label="Continuar" onPress={handleSubmit} loading={loading} />

        <Text style={styles.signOut} onPress={() => signOut()}>
          Cerrar sesión
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.size.display, fontWeight: typography.weight.bold, marginTop: spacing.xl },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl, lineHeight: 20 },
  form: { gap: spacing.md },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  dobRow: { flexDirection: 'row', gap: spacing.xs },
  dobInput: { width: 64 },
  dobInputYear: { width: 90 },
  error: { color: colors.danger, fontSize: typography.size.sm },
  signOut: { color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.sm },
});
