import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  onChange: (date: Date) => void;
};

export function DateTimeField({ label, value, minimumDate, onChange }: Props) {
  const [stage, setStage] = useState<'closed' | 'date' | 'time'>('closed');
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const open = () => setStage('date');

  const handleChange = (event: { type: string }, selected?: Date) => {
    if (Platform.OS === 'android') {
      if (event.type !== 'set' || !selected) {
        setStage('closed');
        return;
      }
      if (stage === 'date') {
        setPendingDate(selected);
        setStage('time');
      } else {
        const base = pendingDate ?? value ?? new Date();
        const combined = new Date(base);
        combined.setHours(selected.getHours(), selected.getMinutes());
        onChange(combined);
        setStage('closed');
        setPendingDate(null);
      }
      return;
    }

    // iOS: inline picker, keep updating a working value until confirmed.
    if (selected) setPendingDate(selected);
  };

  const confirmIOS = () => {
    if (pendingDate) onChange(pendingDate);
    setStage('closed');
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={open}>
        <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
        <Text style={value ? styles.value : styles.placeholder}>
          {value ? formatFull(value) : 'Elegir fecha y hora'}
        </Text>
      </Pressable>

      {stage !== 'closed' && Platform.OS === 'android' && (
        <DateTimePicker
          value={pendingDate ?? value ?? new Date()}
          mode={stage}
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}

      {stage !== 'closed' && Platform.OS === 'ios' && (
        <View style={styles.iosSheet}>
          <DateTimePicker
            value={pendingDate ?? value ?? new Date()}
            mode="datetime"
            display="spinner"
            minimumDate={minimumDate}
            onChange={handleChange}
            themeVariant="dark"
          />
          <Pressable style={styles.confirmButton} onPress={confirmIOS}>
            <Text style={styles.confirmText}>Listo</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function formatFull(date: Date): string {
  return date.toLocaleString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xxs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  value: { color: colors.textPrimary, fontSize: typography.size.md },
  placeholder: { color: colors.textMuted, fontSize: typography.size.md },
  iosSheet: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  confirmButton: { alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  confirmText: { color: colors.accent, fontWeight: typography.weight.semibold },
});
