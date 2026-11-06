import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@/components/ui/BottomSheetModal';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { userFacingError } from '@/lib/errors';
import { blockUser } from '@/services/reports';

/**
 * Denunciar y bloquear, en la misma pantalla donde está el contenido.
 *
 * La Guideline 1.2 de Apple no se conforma con que las dos acciones existan
 * en algún lado: tienen que estar accesibles desde el contenido o la persona
 * en cuestión. Por eso vive como una hoja reutilizable y no como una pantalla
 * de Configuración.
 *
 * La confirmación de bloqueo es un segundo paso dentro de la misma hoja y no
 * un `Alert.alert`: la app también corre en web, donde el Alert de React
 * Native Web no siempre aparece, y un bloqueo que se ejecuta sin confirmar
 * por un toque mal dado no tiene vuelta atrás desde esta pantalla.
 */

type Props = {
  visible: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  /** Qué hacer después de bloquear — normalmente volver atrás o refrescar. */
  onBlocked?: () => void;
  /** Opciones propias de la pantalla que abre la hoja (ver perfil, salir del chat...). */
  children?: ReactNode;
};

export function UserSafetySheet({ visible, onClose, userId, displayName, onBlocked, children }: Props) {
  const router = useRouter();
  const [confirmingBlock, setConfirmingBlock] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada apertura arranca en el menú, no en la confirmación que quedó de la
  // vez anterior.
  useEffect(() => {
    if (visible) {
      setConfirmingBlock(false);
      setError(null);
    }
  }, [visible]);

  const handleBlock = async () => {
    setBlocking(true);
    setError(null);
    try {
      await blockUser(userId);
      onClose();
      onBlocked?.();
    } catch (e: unknown) {
      setError(userFacingError(e, 'No pudimos bloquear a esta persona. Probá de nuevo.'));
    } finally {
      setBlocking(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      {confirmingBlock ? (
        <View style={styles.confirm}>
          <View style={styles.confirmIcon}>
            <Ionicons name="ban" size={22} color={colors.danger} />
          </View>
          <Text style={styles.confirmTitle}>¿Bloquear a {displayName}?</Text>
          <Text style={styles.confirmBody}>
            No va a poder escribirte ni ver tu perfil y tus fiestas, y vos no vas a ver los suyos. Podés desbloquearlo cuando quieras desde
            Configuración → Privacidad y seguridad.
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.confirmActions}>
            <Pressable style={[styles.confirmButton, styles.cancelButton]} onPress={() => setConfirmingBlock(false)} disabled={blocking}>
              <Text style={styles.cancelLabel}>Cancelar</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, styles.blockButton]} onPress={handleBlock} disabled={blocking}>
              {blocking ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.blockLabel}>Bloquear</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.menu}>
          {children}
          <SafetyOption
            icon="flag-outline"
            label={`Denunciar a ${displayName}`}
            onPress={() => {
              onClose();
              router.push({ pathname: '/report', params: { targetType: 'profile', targetId: userId } });
            }}
          />
          <SafetyOption icon="ban-outline" label={`Bloquear a ${displayName}`} danger onPress={() => setConfirmingBlock(true)} />
        </View>
      )}
    </BottomSheetModal>
  );
}

export function SafetyOption({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.optionRow} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.textPrimary} />
      <Text style={[styles.optionLabel, danger && styles.optionLabelDanger]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: { paddingBottom: spacing.xs },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  optionLabel: { flex: 1, color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.medium },
  optionLabelDanger: { color: colors.danger },
  confirm: { paddingVertical: spacing.sm, paddingBottom: spacing.md, gap: spacing.xs },
  confirmIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  confirmTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  confirmBody: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  error: { color: colors.danger, fontSize: typography.size.sm, marginTop: spacing.xxs },
  confirmActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  confirmButton: { flex: 1, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  cancelLabel: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  blockButton: { backgroundColor: colors.danger },
  blockLabel: { color: colors.white, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
});
