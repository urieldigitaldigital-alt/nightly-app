import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Props = {
  title: string;
  /** Si viene, aparece el botón "Ver todo" a la derecha. */
  onViewAll?: () => void;
  viewAllLabel?: string;
};

/** Título de sección con su acción opcional. Es lo que le da ritmo al Inicio. */
export function SectionHeader({ title, onViewAll, viewAllLabel = 'Ver todo' }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>{title}</Text>
      {onViewAll ? (
        <PressableScale
          style={styles.action}
          scaleTo={0.94}
          onPress={onViewAll}
          accessibilityRole="button"
          accessibilityLabel={`${viewAllLabel}: ${title}`}
        >
          <Text style={styles.actionLabel}>{viewAllLabel}</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    // El botón "Ver todo" mide 32 de alto, menos que los 44 mínimos de toque.
    // Este relleno vertical le agrega área táctil sin separar el título de la
    // sección que encabeza.
    paddingVertical: spacing.xxs,
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  actionLabel: {
    color: colors.textSecondary,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
  },
});
