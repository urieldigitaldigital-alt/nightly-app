import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@/constants/theme';

export function WizardHeader({ step, totalSteps, title }: { step: number; totalSteps: number; title: string }) {
  const router = useRouter();

  return (
    <View style={styles.root}>
      <View style={styles.topRow}>
        <Pressable hitSlop={10} onPress={() => (step === 1 ? router.back() : router.back())}>
          <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepLabel}>
          Paso {step} de {totalSteps}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressRow}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View key={i} style={[styles.progressSegment, i < step && styles.progressSegmentActive]} />
        ))}
      </View>

      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepLabel: { color: colors.textMuted, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
  progressRow: { flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: colors.surfaceRaised },
  progressSegmentActive: { backgroundColor: colors.accent },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, marginTop: spacing.xs },
});
