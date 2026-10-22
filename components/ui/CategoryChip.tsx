import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  active?: boolean;
  onPress: () => void;
};

export function CategoryChip({ label, active = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.base, active && styles.active]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  labelActive: {
    color: colors.accentText,
    fontWeight: typography.weight.semibold,
  },
});
