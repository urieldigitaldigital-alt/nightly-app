import { useState } from 'react';
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
  const [showDetail, setShowDetail] = useState(false);

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

        {/* El detalle no se muestra de entrada: a quien usa la app no le
            dice nada y ocupa la pantalla. Pero esconderlo del todo en
            produccion dejaba a los crashes sin forma de diagnosticarse
            —habia que pedirle a la persona que abriera la consola del
            navegador—, asi que ahora esta a un toque de distancia.

            El stack sigue siendo exclusivo de desarrollo: ahi si aparecen
            rutas internas y nombres de funciones que no tienen por que
            salir de la maquina de quien programa. */}
        <Pressable
          onPress={() => setShowDetail((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={showDetail ? 'Ocultar el detalle tecnico' : 'Ver el detalle tecnico'}
          hitSlop={8}
        >
          <Text style={styles.detailToggle}>{showDetail ? 'Ocultar detalle' : 'Ver detalle tecnico'}</Text>
        </Pressable>

        {showDetail && (
          <View style={styles.debugBox}>
            <Text style={styles.debugTitle}>Detalle</Text>
            <Text selectable style={styles.debugText}>
              {error.message || 'Sin mensaje'}
            </Text>
            {__DEV__ && error.stack ? (
              <Text selectable style={styles.debugStack}>
                {error.stack}
              </Text>
            ) : null}
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
  detailToggle: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    textDecorationLine: 'underline',
    marginTop: spacing.md,
  },
  version: { color: colors.textMuted, fontSize: typography.size.xs, marginTop: spacing.xl },
});
