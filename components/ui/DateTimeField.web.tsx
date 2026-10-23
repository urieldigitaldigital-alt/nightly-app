import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';

type Props = {
  label: string;
  value: Date | null;
  minimumDate?: Date;
  onChange: (date: Date) => void;
};

// @react-native-community/datetimepicker has no web implementation at all —
// the native file's Android/iOS branches both just silently render nothing
// on web, leaving the field unusable (tapping it does nothing, blocking the
// whole create-event wizard since step 1 requires a start date to continue).
// The browser's own <input type="datetime-local"> needs no native module.
export function DateTimeField({ label, value, minimumDate, onChange }: Props) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        <input
          type="datetime-local"
          value={toInputValue(value)}
          min={minimumDate ? toInputValue(minimumDate) : undefined}
          onChange={(e) => {
            const next = fromInputValue(e.target.value);
            if (next) onChange(next);
          }}
          style={webInputStyle}
        />
      </View>
    </View>
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromInputValue(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// A raw DOM element needs CSS-in-JS (camelCase, numbers as px), not an RN
// StyleSheet — this isn't a React Native view.
const webInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: colors.textPrimary,
  fontSize: typography.size.md,
  colorScheme: 'dark',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  label: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.medium, marginBottom: spacing.xxs },
  field: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
