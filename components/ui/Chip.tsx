import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type ChipProps = {
  label: string;
  active?: boolean;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Número a la derecha, para filtros que dicen cuántos resultados traen. */
  count?: number;
};

/**
 * Filtro de una sola línea. Activo: cian sólido con resplandor y texto
 * oscuro. Inactivo: superficie con borde apenas visible.
 *
 * El relleno vertical de 10 más el texto llegan a los 44 de alto que pide
 * Apple como área mínima de toque; no bajar de ahí aunque se vea más
 * compacto.
 */
export function Chip({ label, active, onPress, icon, count }: ChipProps) {
  return (
    <PressableScale
      style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
      scaleTo={0.94}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.accentText : colors.textSecondary} /> : null}
      <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>{label}</Text>
      {count != null ? (
        <Text style={[styles.count, active ? styles.labelActive : styles.countIdle]}>{count}</Text>
      ) : null}
    </PressableScale>
  );
}

/**
 * Carril horizontal para los chips.
 *
 * El relleno lateral va adentro del ScrollView y no afuera: así el primer
 * chip arranca alineado con el resto de la pantalla, pero al deslizar los
 * chips siguen hasta el borde en vez de cortarse contra un margen.
 */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // En web el carril no tiene inercia y un chip puede quedar a medias;
      // enganchar al inicio de cada uno evita ese corte.
      decelerationRate="fast"
    >
      {children}
    </ScrollView>
  );
}

/** Separador flexible para empujar chips al final del carril. */
export function ChipSpacer() {
  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
  },
  spacer: { flex: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  chipActive: { backgroundColor: colors.accent, ...shadows.glow },
  chipIdle: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
  },
  labelActive: { color: colors.accentText },
  labelIdle: { color: colors.textSecondary },
  count: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    fontVariant: ['tabular-nums'],
  },
  countIdle: { color: colors.textMuted },
});
