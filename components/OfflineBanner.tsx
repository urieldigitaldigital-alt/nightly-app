import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Franja que aparece arriba de todo cuando se cae la conexión.
 *
 * Sin esto, estar sin internet se parece demasiado a que la app esté rota:
 * las listas quedan vacías, los mensajes no salen y nada explica por qué. Es
 * también lo primero que ve un revisor de Apple si prueba la app en modo
 * avión, y la diferencia entre "está pensada" y "está rota".
 */

/** Alto visible de la franja, sin contar el área segura de arriba. */
const BANNER_HEIGHT = 30;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [offline, setOffline] = useState(false);
  const translateY = useSharedValue(-120);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isInternetReachable` es null mientras NetInfo todavía está
      // averiguando: tratarlo como "sin internet" haría parpadear la franja
      // en cada arranque. Solo un false explícito cuenta.
      const isOffline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(isOffline);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const target = offline ? 0 : -(BANNER_HEIGHT + insets.top + 10);
    translateY.value = reducedMotion ? target : withTiming(target, { duration: 220 });
  }, [offline, insets.top, reducedMotion, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Animated.View
      style={[styles.banner, { paddingTop: insets.top + 4 }, animatedStyle]}
      // Mientras hay conexión la franja está fuera de pantalla: sin esto
      // seguiría capturando toques sobre la parte de arriba de la app.
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <Ionicons name="cloud-offline-outline" size={14} color={colors.accentText} />
      <Text style={styles.text}>Sin conexión — algunas cosas no van a funcionar</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.warning,
    borderBottomLeftRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  text: { color: colors.accentText, fontSize: typography.size.xs, fontWeight: typography.weight.semibold },
});
