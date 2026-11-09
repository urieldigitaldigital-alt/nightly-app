import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
// Expo Router trae su propia copia de bottom-tabs y reexporta los tipos:
// `@react-navigation/bottom-tabs` no es una dependencia directa del proyecto
// y agregarla traería una segunda versión del navegador.
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accentGradient, colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { PressableScale } from '@/components/ui/PressableScale';

/**
 * Barra de navegación inferior.
 *
 * Es flotante: no toca los bordes de la pantalla y deja ver el contenido
 * desenfocado por detrás. Eso es lo que la separa de una barra de pestañas
 * del sistema y lo que hace que el mapa, que va a pantalla completa, siga
 * leyéndose debajo de ella.
 *
 * El botón del medio es "Publicar" y no "Mapa" como pedía el documento de
 * diseño. El botón central elevado es, en todas las apps que usan este
 * patrón, la acción principal —crear algo—, no un destino de navegación.
 * Mandar el mapa ahí dejaría a "Publicar" como una pestaña chica más y haría
 * menos visible lo único que hace crecer la app: que alguien publique una
 * previa.
 */

const CONTENT_HEIGHT = 68;
/** Cuánto sobresale el botón central por arriba de la barra. */
const CENTER_LIFT = 22;

type TabMeta = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  center?: boolean;
};

const TABS: Record<string, TabMeta> = {
  discover: { label: 'Inicio', icon: 'compass-outline', iconActive: 'compass' },
  map: { label: 'Mapa', icon: 'map-outline', iconActive: 'map' },
  publish: { label: 'Publicar', icon: 'add', iconActive: 'add', center: true },
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
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {/* El desenfoque va como capa y el color encima: el `BlurView` solo
            no alcanza para que el texto blanco se lea cuando debajo pasa el
            mapa claro o una foto. */}
        <BlurView intensity={40} tint="dark" style={styles.blur} />
        <View style={styles.barTint} pointerEvents="none" />

        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;

          const focused = state.index === index;
          // `navigateToTab` es lo que expone esta versión de Expo Router, y
          // ya se encarga sola de emitir `tabPress` y de volver a la raíz de
          // la pestaña si se toca la que ya está abierta.
          const onPress = () => navigateToTab(route.key);

          return meta.center ? (
            <CenterTab key={route.key} meta={meta} onPress={onPress} />
          ) : (
            <Tab key={route.key} meta={meta} focused={focused} onPress={onPress} />
          );
        })}
      </View>
    </View>
  );
}

function Tab({ meta, focused, onPress }: { meta: TabMeta; focused: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const dot = useSharedValue(focused ? 1 : 0);
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
      dot.value = focused ? 1 : 0;
      return;
    }
    if (focused) {
      scale.value = withSequence(withTiming(1.18, { duration: 100 }), withSpring(1, { damping: 7, stiffness: 220 }));
      dot.value = withSpring(1, { damping: 10, stiffness: 220 });
      vibrateTap();
    } else {
      dot.value = withTiming(0, { duration: 150 });
    }
  }, [focused, reducedMotion, scale, dot]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dot.value, transform: [{ scale: dot.value }] }));

  return (
    <PressableScale
      style={styles.tab}
      scaleTo={0.9}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
    >
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? meta.iconActive : meta.icon}
          size={22}
          color={focused ? colors.accent : colors.textMuted}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : null]} numberOfLines={1}>
        {meta.label}
      </Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </PressableScale>
  );
}

function CenterTab({ meta, onPress }: { meta: TabMeta; onPress: () => void }) {
  return (
    <View style={styles.centerSlot}>
      <PressableScale
        style={styles.center}
        scaleTo={0.9}
        onPress={() => {
          vibrateTap();
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel={meta.label}
      >
        <LinearGradient
          colors={[...accentGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerFill}
        >
          <Ionicons name="add" size={28} color={colors.accentText} />
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

/**
 * Espacio que cada pantalla tiene que dejar libre abajo para que la barra no
 * tape el último elemento de una lista.
 */
export function useBottomNavInset() {
  const insets = useSafeAreaInsets();
  return CONTENT_HEIGHT + Math.max(insets.bottom, spacing.sm) + spacing.sm;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.sm,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CONTENT_HEIGHT,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xxs,
    // La sombra sale hacia arriba, que es de donde viene el contenido.
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -8 },
    elevation: 16,
    // Sin esto el botón central, que sobresale por arriba, queda recortado
    // en Android.
    overflow: 'visible',
  },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  barTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(20,27,35,0.86)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 10.5,
    fontWeight: typography.weight.medium,
  },
  tabLabelActive: { color: colors.textPrimary },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  centerSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -CENTER_LIFT,
    // El aro del color del fondo es lo que hace que el botón se lea
    // "apoyado arriba" de la barra y no pegado a ella.
    borderWidth: 4,
    borderColor: colors.background,
    ...shadows.glow,
  },
  centerFill: {
    flex: 1,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
