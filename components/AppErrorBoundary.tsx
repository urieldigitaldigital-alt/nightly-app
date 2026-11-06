import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';

/**
 * Pantalla que se muestra cuando algo revienta de verdad, en lugar de dejar
 * la app en blanco o cerrarse sola.
 *
 * Guideline 2.1 (App Completeness): una app que se cierra sola durante la
 * revisión es rechazo directo. Esto no arregla el bug, pero convierte un
 * crash en algo de lo que la persona puede salir — y, en la revisión, en una
 * pantalla que explica qué pasó en vez de un cierre inexplicable.
 *
 * Expo Router busca un export llamado `ErrorBoundary` en cada archivo de
 * layout y lo usa para ese tramo de la navegación; `app/_layout.tsx` lo
 * reexporta desde acá para cubrir toda la app.
 */

export type AppErrorBoundaryProps = {
  error: Error;
  retry: () => Promise<void>;
};

export function AppErrorBoundary({ error, retry }: AppErrorBoundaryProps) {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
        </View>

        <Text style={styles.title}>Algo se rompió</Text>
        <Text style={styles.body}>
          Tuvimos un problema inesperado y esta pantalla no pudo cargar. Podés reintentar; si vuelve a pasar, escribinos y lo arreglamos.
        </Text>

        <Pressable style={styles.primaryButton} onPress={() => retry()} accessibilityRole="button">
          <Text style={styles.primaryLabel}>Reintentar</Text>
        </Pressable>

        <Text style={styles.support}>{brand.supportEmail}</Text>

        {/* El detalle técnico solo en desarrollo: en producción no le dice
            nada útil a la persona y puede filtrar información interna. */}
        {__DEV__ && (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>Detalle (solo en desarrollo)</Text>
            <Text style={styles.debugText}>{error.message}</Text>
            {error.stack ? <Text style={styles.debugStack}>{error.stack}</Text> : null}
          </View>
        )}

        <Text style={styles.version}>
          {brand.name} v{Constants.expoConfig?.version ?? '1.0.0'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold },
  body: { color: colors.textSecondary, fontSize: typography.size.md, lineHeight: 21, textAlign: 'center', marginBottom: spacing.md },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xxl,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: { color: colors.accentText, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  support: { color: colors.textMuted, fontSize: typography.size.sm, marginTop: spacing.xs },
  debugBox: {
    marginTop: spacing.xl,
    width: '100%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  debugTitle: { color: colors.warning, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
  debugText: { color: colors.textPrimary, fontSize: typography.size.sm },
  debugStack: { color: colors.textMuted, fontSize: 10, lineHeight: 14 },
  version: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xl },
});
