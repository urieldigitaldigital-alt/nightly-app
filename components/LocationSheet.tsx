import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { colors, spacing, typography } from '@/constants/theme';
import { LAUNCH_CITIES } from '@/constants/cities';
import { useLocationStore } from '@/stores/locationStore';

const RADIUS_OPTIONS = [1, 5, 10, 20, 50];

export function LocationSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const origin = useLocationStore((s) => s.origin);
  const radiusKm = useLocationStore((s) => s.radiusKm);
  const setRadiusKm = useLocationStore((s) => s.setRadiusKm);
  const setManualCity = useLocationStore((s) => s.setManualCity);
  const requestPermissionAndLocate = useLocationStore((s) => s.requestPermissionAndLocate);

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Ubicación y radio</Text>

      <Button
        label="Usar mi ubicación actual"
        variant="secondary"
        icon={<Ionicons name="locate" size={16} color={colors.textPrimary} />}
        onPress={async () => {
          await requestPermissionAndLocate();
        }}
      />

      <Text style={styles.label}>O elegí una zona</Text>
      <View style={styles.grid}>
        {LAUNCH_CITIES.map((c) => (
          <CategoryChip key={c.name} label={c.name} active={origin.label === c.name} onPress={() => setManualCity(c)} />
        ))}
      </View>

      <Text style={styles.label}>Radio de búsqueda: {radiusKm} km</Text>
      <View style={styles.grid}>
        {RADIUS_OPTIONS.map((km) => (
          <CategoryChip key={km} label={`${km} km`} active={radiusKm === km} onPress={() => setRadiusKm(km)} />
        ))}
      </View>

      <Button label="Listo" onPress={onClose} />
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold, marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginTop: spacing.lg, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
});
