import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
// Expo Router trae su propia copia de bottom-tabs y reexporta los tipos:
// `@react-navigation/bottom-tabs` no es una dependencia directa del proyecto
// y agregarla traería una segunda versión del navegador.
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '@/constants/theme';
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
 * navegación, que es justo lo que no tiene que hacer.
 *
 * "Publicar" queda como una pestaña más, con su ícono de más. Sigue en el
 * medio, que es el lugar más cómodo para el pulgar.
 *
 * Hay dos formas de montarla:
 *
 * - `BottomNav` es la que dibuja el navegador de pestañas.
 * - `GlobalNavBar` es la misma barra en una pantalla que se abrió por
 *   encima de las pestañas (Boliches, Tendencias, Notificaciones…). Sin
 *   ella, al entrar a una sección la barra desaparecía y solo se podía
 *   volver un paso atrás, nunca saltar a otra sección.
 */

const CONTENT_HEIGHT = 56;

type TabMeta = {
  route: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
};

const TABS: Record<string, TabMeta> = {
  discover: { route: '/(tabs)/discover', label: 'Inicio', icon: 'compass-outline', iconActive: 'compass' },
  map: { route: '/(tabs)/map', label: 'Mapa', icon: 'map-outline', iconActive: 'map' },
  publish: { route: '/(tabs)/publish', label: 'Publicar', icon: 'add-circle-outline', iconActive: 'add-circle' },
  chat: { route: '/(tabs)/chat', label: 'Chat', icon: 'chatbubble-outline', iconActive: 'chatbubble' },
  profile: { route: '/(tabs)/profile', label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
};

/** El orden en que se dibujan. Coincide con el de `app/(tabs)/_layout.tsx`. */
const TAB_ORDER = ['discover', 'map', 'publish', 'chat', 'profile'] as const;

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

/** La barra del navegador de pestañas. */
export function BottomNav({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <Bar floating paddingBottom={insets.bottom}>
      {state.routes.map((route, index) => {
        // Solo el primer tramo del nombre. Las pestañas son carpetas con un
        // `index.tsx` adentro, así que Expo Router las nombra
        // "discover/index", no "discover". Buscar por el nombre completo
        // devolvía undefined para las cinco y la barra se dibujaba vacía:
        // se veía el fondo pero ningún ícono, y no se podía navegar.
        const meta = TABS[route.name.split('/')[0]];
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
    </Bar>
  );
}

/**
 * La misma barra, para pantallas que se abren por encima de las pestañas.
 *
 * Ninguna queda marcada como activa, y es correcto: la persona no está
 * parada en ninguna pestaña, está en una pantalla aparte. Marcar una sería
 * mentirle sobre dónde está.
 *
 * Se usa `navigate` y no `push`: si la pestaña ya está en el historial,
 * vuelve a ella en lugar de apilar una copia. Sin eso, ir y venir entre
 * secciones dejaría una pila infinita y el gesto de volver nunca llegaría
 * al inicio.
 */
export function GlobalNavBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Bar floating paddingBottom={insets.bottom}>
      {TAB_ORDER.map((key) => {
        const meta = TABS[key];
        return (
          <Tab
            key={key}
            meta={meta}
            focused={false}
            onPress={() => {
              vibrateTap();
              router.navigate(meta.route as never);
            }}
          />
        );
      })}
    </Bar>
  );
}

function Bar({
  children,
  paddingBottom,
  floating,
}: {
  children: React.ReactNode;
  paddingBottom: number;
  /**
   * Solo para `GlobalNavBar`, que se monta encima de una pantalla cualquiera
   * y necesita anclarse al borde.
   *
   * `BottomNav` va sin esto: el navegador de pestañas le reserva su lugar
   * abajo, y ponerla en absoluto la sacaba de ese lugar y la dejaba
   * invisible, con una franja vacía donde tenía que estar la barra. Era un
   * resto de cuando la barra flotaba por encima del contenido.
   */
  floating?: boolean;
}) {
  return (
    <View style={[styles.root, floating && styles.floating, { marginBottom: paddingBottom + spacing.xs }]}>
      <View style={styles.row}>{children}</View>
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
  // El alto visible, más el margen de abajo y el recorte del sistema.
  return CONTENT_HEIGHT + insets.bottom + spacing.xs * 2;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    // Flotante: separada de los bordes y con esquinas redondeadas, para que
    // el contenido se vea pasar por debajo en vez de quedar cortado contra
    // una barra pegada al borde.
    marginHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  floating: { position: 'absolute', left: 0, right: 0, bottom: 0 },
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
