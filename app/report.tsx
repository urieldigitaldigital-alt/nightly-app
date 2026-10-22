import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CategoryChip } from '@/components/ui/CategoryChip';
import { colors, spacing, typography } from '@/constants/theme';
import { fileReport, ReportTargetType } from '@/services/reports';

const REASONS = [
  'Contenido falso o engañoso',
  'Actividad peligrosa o ilegal',
  'Acoso o comportamiento abusivo',
  'Spam',
  'Dirección privada expuesta sin permiso',
  'Otro',
];

export default function ReportScreen() {
  const { targetType, targetId } = useLocalSearchParams<{ targetType: ReportTargetType; targetId: string }>();
  const router = useRouter();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      await fileReport(targetType, targetId, reason, details || undefined);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Screen padded edges={['top', 'bottom']}>
        <View style={styles.success}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={styles.successTitle}>Gracias por avisarnos</Text>
          <Text style={styles.successBody}>Nuestro equipo va a revisar esto. No es público quién hizo la denuncia.</Text>
          <Button label="Volver" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Denunciar</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.label}>¿Cuál es el problema?</Text>
      <View style={styles.grid}>
        {REASONS.map((r) => (
          <CategoryChip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>

      <Input label="Detalles (opcional)" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm }} value={details} onChangeText={setDetails} />

      <View style={{ marginTop: spacing.lg }}>
        <Button label="Enviar denuncia" onPress={handleSubmit} loading={loading} disabled={!reason} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  successTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  successBody: { color: colors.textSecondary, fontSize: typography.size.md, textAlign: 'center', lineHeight: 20, marginBottom: spacing.md },
});
