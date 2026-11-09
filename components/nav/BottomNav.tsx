import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
// Expo Router trae su propia copia de bottom-tabs y reexporta los tipos:
// `@react-navigation/bottom-tabs` no es una dependencia directa del proyecto
// y agregarla traería una segunda versión del navegador.
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PressableScale } from '@/components/ui/PressableScale';

/**
 * Barra de pestañas.
 *
 * Es una barra común, apoyada abajo, con una línea fina arriba: cinco
 * pestañas iguales y el acento solo en la activa.
 *
 * Antes era una barra flotante con esquinas muy redondeadas, desenfoque por
 * detrás y un botón central elevado con degradé y resplandor. Se cambió a
 * propósito. Ese patrón está en todas las maquetas de app que circulan y
 * hace que el producto se lea como una demo: llama la atención sobre la
 * navegación, que es justo lo que no tiene que hacer. Una barra que no se
 * nota deja mirar el contenido, y es lo que hacen las apps que uno usa todos
 * los días.
 *
 * "Publicar" queda como una pestaña más, con su ícono de más. Sigue en el
 * medio, que es el lugar más cómodo para el pulgar.
 */

const CONTENT_HEIGHT = 56;

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: Record<string, TabMeta> = {
  discover: { label: 'Inicio', icon: 'compass-outline', iconActive: 'compass' },
  map: { label: 'Mapa', icon: 'map-outline', iconActive: 'map' },
  publish: { label: 'Publicar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  chat: { label: 'Chat', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  profile: { label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
};

function vibrateTap() {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    return;
  }
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function BottomNav({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;

          return (
            <Tab
              key={route.key}
              meta={meta}
              focused={state.index === index}
              // `navigateToTab` ya se encarga sola de emitir `tabPress` y de
              // volver a la raíz de la pestaña si se toca la que ya está
              // abierta.
              onPress={() => navigateToTab(route.key)}
            />
          );
        })}
      </View>
    </View>
  );
}

function Tab({ meta, focused, onPress }: { meta: TabMeta; focused: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const firstRender = useRef(true);

  useEffect(() => {
    // La pestaña que ya está abierta al abrir la app no tiene que rebotar ni
    // vibrar: esto reacciona solo a cambios de pestaña de verdad.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (reducedMotion) {
      scale.value = 1;
      return;
    }
    if (focused) {
      scale.value = withSequence(withTiming(1.12, { duration: 90 }), withSpring(1, { damping: 8, stiffness: 240 }));
      vibrateTap();
    }
  }, [focused, reducedMotion, scale]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <PressableScale
      style={styles.tab}
      scaleTo={0.92}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? meta.iconActive : meta.icon}
          size={24}
          color={focused ? colors.accent : colors.textMuted}
        />
      </Animated.View>
      <Text style={[styles.label, focused ? styles.labelActive : null]} numberOfLines={1}>
        {meta.label}
      </Text>
    </PressableScale>
  );
}

/**
 * Espacio que cada pantalla tiene que dejar libre abajo para que la barra no
 * tape el último elemento de una lista.
 */
export function useBottomNavInset() {
  const insets = useSafeAreaInsets();
  return CONTENT_HEIGHT + insets.bottom;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    // Una línea fina, no una sombra. Sobre fondo oscuro la sombra no se ve y
    // lo único que hace falta es separar la barra del contenido.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    height: CONTENT_HEIGHT,
    alignItems: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xxs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: typography.weight.medium,
  },
  labelActive: { color: colors.accent },
});
