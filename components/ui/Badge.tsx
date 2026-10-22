import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Tone = 'accent' | 'neutral' | 'danger' | 'success' | 'warning';

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <Text style={[styles.label, labelToneStyles[tone]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
});

const toneStyles = StyleSheet.create({
  accent: { backgroundColor: colors.accent },
  neutral: { backgroundColor: colors.surfaceRaised },
  danger: { backgroundColor: 'rgba(255,92,92,0.16)' },
  success: { backgroundColor: 'rgba(77,217,140,0.16)' },
  warning: { backgroundColor: 'rgba(255,184,77,0.16)' },
});

const labelToneStyles = StyleSheet.create({
  accent: { color: colors.accentText },
  neutral: { color: colors.textSecondary },
  danger: { color: colors.danger },
  success: { color: colors.success },
  warning: { color: colors.warning },
});
