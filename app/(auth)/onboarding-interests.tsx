import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { colors, spacing, typography } from '@/constants/theme';
import { MUSIC_GENRES } from '@/constants/musicGenres';
import { updateMyProfile } from '@/services/profiles';
import { useAuthStore } from '@/stores/authStore';

export default function OnboardingInterestsScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (genre: string) => {
    setSelected((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await updateMyProfile({ musicInterests: selected });
      await refreshProfile();
      router.push('/(auth)/location-permission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <Text style={styles.step}>Paso 2 de 3</Text>
      <Text style={styles.title}>¿Qué música te mueve?</Text>
      <Text style={styles.subtitle}>Elegí las que quieras — te ayuda a ver fiestas más relevantes primero.</Text>

      <View style={styles.grid}>
        {MUSIC_GENRES.map((genre) => (
          <CategoryChip key={genre} label={genre} active={selected.includes(genre)} onPress={() => toggle(genre)} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={selected.length > 0 ? 'Continuar' : 'Elegir después'} onPress={handleContinue} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.xxs },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  footer: { marginTop: 'auto', paddingTop: spacing.xl },
});
