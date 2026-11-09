import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { accentGradient, colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  children?: React.ReactNode;
};

/**
 * La card grande de arriba del Inicio: fondo en degradé cian, texto oscuro,
 * un número grande y hasta cuatro accesos.
 *
 * Es el único lugar de la app donde el acento ocupa una superficie grande.
 * Funciona porque hay exactamente uno por pantalla; si se repitiera, el
 * degradé dejaría de significar "esto es lo importante" y la pantalla se
 * volvería ruido cian.
 */
export function HeroCard({ title, value, subtitle, children }: Props) {
  return (
    <LinearGradient
      colors={[...accentGradient]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.root}
    >
      {/* Mancha clara en la esquina. Le saca al degradé el aspecto de relleno
          plano y da la sensación de una luz fuera de cuadro. */}
      <View style={styles.bloom} pointerEvents="none" />

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      {children ? <View style={styles.actions}>{children}</View> : null}
    </LinearGradient>
  );
}

type ActionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

/** Acceso de la HeroCard: cuadrado oscuro redondeado con el ícono en cian. */
export function HeroAction({ icon, label, onPress }: ActionProps) {
  return (
    <PressableScale
      style={styles.action}
      scaleTo={0.93}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={21} color={colors.accent} />
      </View>
      <Text style={styles.actionLabel} numberOfLines={1}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  bloom: {
    position: 'absolute',
    top: -56,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  title: {
    color: colors.accentText,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    opacity: 0.75,
  },
  value: {
    color: colors.accentText,
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    fontVariant: ['tabular-nums'],
    marginTop: 2,
  },
  subtitle: {
    color: colors.accentText,
    fontSize: typography.size.sm,
    opacity: 0.7,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.accentText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: colors.accentText,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
});
