import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { LAUNCH_CITIES } from '@/constants/cities';
import { useLocationStore } from '@/stores/locationStore';
import { finishOnboarding } from '@/services/profiles';
import { useAuthStore } from '@/stores/authStore';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const requestPermissionAndLocate = useLocationStore((s) => s.requestPermissionAndLocate);
  const setManualCity = useLocationStore((s) => s.setManualCity);
  const origin = useLocationStore((s) => s.origin);
  const [loading, setLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await finishOnboarding();
      await refreshProfile();
      router.replace('/(tabs)/discover');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableLocation = async () => {
    setLoading(true);
    try {
      await requestPermissionAndLocate();
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        setShowCityPicker(true);
        return;
      }
      await finish();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <Text style={styles.step}>Paso 3 de 3</Text>
      <Text style={styles.title}>¿Dónde buscamos planes?</Text>
      <Text style={styles.subtitle}>
        Usamos tu ubicación solo para mostrarte previas y fiestas dentro de un radio que vos controlás. Podés usar la app igual sin
        darnos acceso permanente.
      </Text>

      <View style={styles.iconWrapper}>
        <Ionicons name="location" size={48} color={colors.accent} />
      </View>

      {!showCityPicker ? (
        <View style={styles.actions}>
          <Button label="Activar ubicación" onPress={handleEnableLocation} loading={loading} />
          <Button label="Elegir ciudad manualmente" variant="outline" onPress={() => setShowCityPicker(true)} />
        </View>
      ) : (
        <View style={styles.cityPicker}>
          <Text style={styles.label}>Elegí tu zona</Text>
          <View style={styles.cityGrid}>
            {LAUNCH_CITIES.map((c) => (
              <CategoryChip key={c.name} label={c.name} active={origin.label === c.name} onPress={() => setManualCity(c)} />
            ))}
          </View>
          <Button label="Continuar" onPress={finish} loading={loading} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.xxs },
  subtitle: { color: colors.textSecondary, fontSize: typography.size.md, marginTop: spacing.xxs, marginBottom: spacing.xl, lineHeight: 20 },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: spacing.xl,
  },
  actions: { gap: spacing.sm, marginTop: 'auto', paddingBottom: spacing.md },
  cityPicker: { gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  cityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.lg },
});
