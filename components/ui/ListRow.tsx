import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  /** Segunda línea: organizador, horario, cuántos confirmaron. */
  meta?: string;
  /** Ícono en el cuadrado de la izquierda. Se ignora si viene `leading`. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Para poner un avatar o el logo de un boliche en lugar del ícono. */
  leading?: React.ReactNode;
  /** Dato principal de la derecha, en cian. Normalmente la distancia. */
  value?: string;
  /** Debajo del dato, en gris. Normalmente la hora. */
  valueMeta?: string;
  onPress?: () => void;
  /** Acción propia a la derecha (ej. el botón de Instagram). Reemplaza a `value`. */
  trailing?: React.ReactNode;
};

/**
 * Fila de lista. Es el formato de las previas de esta noche, los boliches
 * cercanos y cualquier listado que tenga ícono, dos líneas de texto y un
 * dato a la derecha.
 *
 * `numberOfLines` en el título y el meta no es decorativo: los nombres de
 * evento los escriben los usuarios y sin eso una previa con nombre largo
 * empuja la distancia fuera de la pantalla.
 */
export function ListRow({ title, meta, icon, leading, value, valueMeta, onPress, trailing }: Props) {
  const body = (
    <>
      {leading ?? (
        <View style={styles.iconTile}>
          <Ionicons name={icon ?? 'ellipse-outline'} size={20} color={colors.accent} />
        </View>
      )}

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {trailing ??
        (value ? (
          <View style={styles.valueWrap}>
            <Text style={styles.value}>{value}</Text>
            {valueMeta ? <Text style={styles.valueMeta}>{valueMeta}</Text> : null}
          </View>
        ) : null)}
    </>
  );

  if (!onPress) return <View style={styles.root}>{body}</View>;

  return (
    <PressableScale
      style={styles.root}
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${title}. ${meta}` : title}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xxs,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  meta: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginTop: 2,
  },
  valueWrap: { alignItems: 'flex-end' },
  value: {
    color: colors.accent,
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    fontVariant: ['tabular-nums'],
  },
  valueMeta: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    marginTop: 2,
  },
});
