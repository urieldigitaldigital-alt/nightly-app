import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Props = {
  children: React.ReactNode;
  /** Superficie más clara y con sombra. Para lo que tiene que leerse como
   * apoyado arriba del resto, no para cualquier card. */
  elevated?: boolean;
  /** Borde cian. Solo para lo elegido o lo que está activo ahora mismo. */
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Para cards que traen su propia imagen o degradé a sangre. */
  noPadding?: boolean;
  accessibilityLabel?: string;
};

/**
 * La caja de la que está hecho casi todo: fondo apenas más claro que la
 * pantalla, borde de un blanco al 6% y esquinas bien redondeadas.
 *
 * El borde es casi invisible a propósito. Lo que separa una card del fondo
 * es el cambio de superficie, no una línea; el borde solo evita que dos
 * cards pegadas se fundan en un bloque.
 */
export function Card({ children, elevated, selected, onPress, style, noPadding, accessibilityLabel }: Props) {
  const content = [
    styles.base,
    elevated ? styles.elevated : styles.flat,
    selected && styles.selected,
    !noPadding && styles.padded,
    style,
  ];

  if (!onPress) return <View style={content}>{children}</View>;

  return (
    <PressableScale
      style={content}
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: { padding: spacing.md },
  flat: { backgroundColor: colors.surface },
  elevated: { backgroundColor: colors.surfaceAlt, ...shadows.card },
  selected: { borderColor: colors.borderStrong },
});
