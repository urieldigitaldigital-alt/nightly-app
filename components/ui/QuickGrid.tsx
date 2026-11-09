import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

export type QuickItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Puntito cian arriba a la derecha, para cuando hay algo pendiente. */
  badge?: boolean;
};

/**
 * Cuadrícula de accesos rápidos de cuatro columnas.
 *
 * El ancho de cada celda sale de `flexBasis: '25%'` y no de medir la
 * pantalla: así cae bien en un iPhone SE, en un Pro Max y en un iPad sin
 * tener que recalcular nada al rotar.
 */
export function QuickGrid({ items }: { items: QuickItem[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <PressableScale
            style={styles.item}
            scaleTo={0.93}
            onPress={item.onPress}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={styles.tile}>
              <Ionicons name={item.icon} size={22} color={colors.accent} />
              {item.badge ? <View style={styles.badge} /> : null}
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
          </PressableScale>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    flexBasis: '25%',
    maxWidth: '25%',
    padding: spacing.xxs,
  },
  item: { alignItems: 'center', gap: 6 },
  tile: {
    width: '100%',
    // Cuadrado perfecto sin importar el ancho de la pantalla.
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: typography.weight.medium,
    textAlign: 'center',
    lineHeight: 14,
  },
});
