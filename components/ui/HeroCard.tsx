import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  children?: React.ReactNode;
};

/**
 * Resumen de lo que hay cerca, con los accesos directos debajo.
 *
 * Estuvo como una card a sangre con degradé cian y el número a 32pt. Se
 * cambió a propósito: un bloque de color saturado con una cifra enorme es la
 * imagen de un panel de control, no la de una app de salidas, y es de las
 * primeras cosas que hacen que algo se lea como generado y no como diseñado.
 *
 * Ahora el peso lo lleva la tipografía y no el color. El acento aparece solo
 * en el número y en los íconos —que es donde señala algo— y la superficie es
 * la misma gris que el resto de la app.
 */
export function HeroCard({ title, value, subtitle, children }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <Text style={styles.count}>{value}</Text>
        <View style={styles.summaryText}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {children ? (
        <>
          <View style={styles.divider} />
          <View style={styles.actions}>{children}</View>
        </>
      ) : null}
    </View>
  );
}

type ActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

/** Acceso directo: ícono y etiqueta, sin recuadro de fondo. */
export function HeroAction({ icon, label, onPress }: ActionProps) {
  return (
    <PressableScale
      style={styles.action}
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  count: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: typography.weight.bold,
    // Sin esto, el número cambia de ancho según los dígitos y el texto de al
    // lado se corre solo cada vez que se actualiza el feed.
    fontVariant: ['tabular-nums'],
  },
  summaryText: { flex: 1, minWidth: 0 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  actions: { flexDirection: 'row' },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingTop: spacing.xs,
    paddingBottom: 2,
  },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
  },
});
