import { useEffect } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Fondo de la pantalla de bienvenida: el atardecer y las palmeras del logo,
 * en movimiento.
 *
 * A propósito **no** repite la silueta de la gente: eso ya está dentro del
 * logo, que va arriba de esta misma pantalla. Dibujarla otra vez de fondo
 * competía con la marca en lugar de acompañarla, y encima se metía detrás de
 * los botones. El fondo pone la atmósfera; el logo pone la escena.
 *
 * Está dibujado por código y no es una foto, por tres razones concretas:
 *
 * - **Pesa cero.** Una foto a pantalla completa que se vea bien en un iPad
 *   Pro son varios megabytes dentro del binario, y es lo primero que ve
 *   alguien que acaba de descargar la app con mala señal.
 * - **Escala sin recortar.** Los degradados y los SVG se ven idénticos en un
 *   iPhone SE y en un iPad en horizontal. Una foto hay que recortarla, y
 *   siempre se come la cabeza de alguien.
 * - **Se mueve.** El sol late, el agua destella y las palmeras se mecen. Una
 *   foto es una foto.
 *
 * Todas las animaciones respetan "Reducir movimiento" del sistema: con esa
 * opción activada la escena queda quieta, no desaparece.
 */

const SKY = ['#040D1A', '#0A2540', '#12486B', '#1C6E8C', '#E8743B', '#F2A03D'] as const;
const SEA = ['#F2A03D', '#1E6B8F', '#0C3A5A', '#061E30'] as const;

/**
 * Las olas. `at` es a qué altura del mar va cada una (0 = horizonte, 1 =
 * borde inferior), `w` cuánto ocupa del ancho y `o` su opacidad.
 *
 * Las de arriba son finitas, anchas y tenues; las de abajo más gruesas y
 * marcadas. Esa progresión es la que da sensación de profundidad: sin ella
 * se ven como rayas pegadas sobre un degradado.
 */
const WAVES = [
  { at: 0.06, w: 0.9, o: 0.16 },
  { at: 0.17, w: 0.78, o: 0.2 },
  { at: 0.3, w: 0.95, o: 0.14 },
  { at: 0.45, w: 0.7, o: 0.18 },
];

/**
 * Una franja de agua que se desplaza de un lado al otro, muy despacio.
 *
 * Cada una arranca con un retraso distinto para que no se muevan todas
 * juntas, que es lo que delataría que son cuatro rectángulos y no agua.
 */
function WaveLine({
  top,
  widthFactor,
  opacity,
  index,
  reducedMotion,
}: {
  top: number;
  widthFactor: number;
  opacity: number;
  index: number;
  reducedMotion: boolean;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    drift.value = withDelay(
      index * 700,
      withRepeat(withTiming(1, { duration: 7000 + index * 1400, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [drift, index, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -14 + drift.value * 28 }],
    opacity: opacity * (0.75 + drift.value * 0.35),
  }));

  return (
    <Animated.View
      style={[
        styles.wave,
        { top, width: `${widthFactor * 100}%`, left: `${((1 - widthFactor) / 2) * 100}%`, height: 2 + index * 1.2 },
        style,
      ]}
    >
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(190,235,255,0.9)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.waveFill}
      />
    </Animated.View>
  );
}

/** Una fronda de palmera: el tallo y las hojas colgando a los lados. */
function PalmFrond({ flip }: { flip?: boolean }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 200" style={flip ? styles.flip : undefined}>
      {[...Array(7)].map((_, i) => {
        const spread = -20 + i * 22;
        return (
          <Path
            key={i}
            d={`M 20 18 Q ${70 + spread * 0.5} ${28 + i * 10} ${120 + spread} ${70 + i * 16}`}
            stroke="#02080E"
            strokeWidth={13 - i * 0.9}
            strokeLinecap="round"
            fill="none"
            opacity={0.97}
          />
        );
      })}
      <Path d="M 0 0 Q 18 10 26 26" stroke="#02080E" strokeWidth={15} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function WelcomeBackground() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  // El horizonte se fija como fracción de la altura para que la escena se
  // recomponga sola al rotar o en una ventana de Split View.
  const horizon = height * 0.58;

  const sunGlow = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const swayLeft = useSharedValue(0);
  const swayRight = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    // Latido del sol: lento y de amplitud chica. Lo que se busca es que la
    // pantalla parezca viva, no que algo parpadee.
    sunGlow.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 3200, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );

    shimmer.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true);

    // Las dos palmeras se mecen desfasadas: si fueran en sincronía se vería
    // como una sola imagen escalando, no como viento.
    swayLeft.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.sin) }), -1, true);
    swayRight.value = withDelay(
      900,
      withRepeat(withTiming(1, { duration: 5400, easing: Easing.inOut(Easing.sin) }), -1, true)
    );
  }, [reducedMotion, sunGlow, shimmer, swayLeft, swayRight]);

  const sunStyle = useAnimatedStyle(() => ({ transform: [{ scale: sunGlow.value }] }));
  const shimmerStyle = useAnimatedStyle(() => ({ opacity: 0.25 + shimmer.value * 0.4 }));
  const leftPalmStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-3 + swayLeft.value * 6}deg` }],
  }));
  const rightPalmStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${3 - swayRight.value * 6}deg` }],
  }));

  const sunSize = Math.min(width * 0.52, 260);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Cielo */}
      <LinearGradient colors={SKY} locations={[0, 0.22, 0.4, 0.54, 0.74, 1]} style={[styles.sky, { height: horizon }]} />

      {/* Sol, justo sobre la línea del horizonte.
          Se dibuja con sombras y no con un degradado radial de SVG: ese
          degradado no resuelve en react-native-svg web y el sol salía como
          un círculo gris. Tres círculos concéntricos con opacidad
          decreciente dan el mismo halo y se ven idénticos en iOS, Android y
          web. */}
      <Animated.View
        style={[
          styles.sun,
          { width: sunSize, height: sunSize, top: horizon - sunSize / 2, left: width / 2 - sunSize / 2 },
          sunStyle,
        ]}
      >
        <View style={[styles.halo, { width: sunSize, height: sunSize, borderRadius: sunSize / 2 }]} />
        <View
          style={[
            styles.halo,
            styles.haloMid,
            { width: sunSize * 0.62, height: sunSize * 0.62, borderRadius: sunSize * 0.31 },
          ]}
        />
        <View
          style={[
            styles.sunCore,
            { width: sunSize * 0.38, height: sunSize * 0.38, borderRadius: sunSize * 0.19 },
          ]}
        />
      </Animated.View>

      {/* Mar */}
      <LinearGradient colors={SEA} locations={[0, 0.12, 0.5, 1]} style={[styles.sea, { top: horizon }]} />

      {/* Olas: cuatro franjas claras que se van ensanchando hacia abajo, como
          la perspectiva real del agua, y se desplazan despacio. Es lo que
          separa un degradado plano de algo que parece mar. */}
      {WAVES.map((w, i) => (
        <WaveLine key={i} top={horizon + (height - horizon) * w.at} widthFactor={w.w} opacity={w.o} index={i} reducedMotion={reducedMotion} />
      ))}

      {/* Reflejo del sol sobre el agua: una columna que se desvanece hacia
          abajo. También por capas, por el mismo motivo que el sol. */}
      <Animated.View style={[styles.reflection, { top: horizon, left: width / 2 - sunSize * 0.22, width: sunSize * 0.44 }, shimmerStyle]}>
        <LinearGradient
          colors={['rgba(255,226,168,0.75)', 'rgba(255,179,77,0.25)', 'rgba(255,179,77,0)']}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Palmeras en las esquinas de arriba */}
      <Animated.View style={[styles.palm, styles.palmLeft, { width: width * 0.62, height: width * 0.62 }, leftPalmStyle]}>
        <PalmFrond />
      </Animated.View>
      <Animated.View style={[styles.palm, styles.palmRight, { width: width * 0.62, height: width * 0.62 }, rightPalmStyle]}>
        <PalmFrond flip />
      </Animated.View>

      {/* Velo oscuro: sin esto el texto blanco pelea con el naranja del sol */}
      <LinearGradient
        colors={['rgba(2,8,14,0.82)', 'rgba(2,8,14,0.35)', 'rgba(2,8,14,0.55)', 'rgba(2,8,14,0.96)']}
        locations={[0, 0.3, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { position: 'absolute', top: 0, left: 0, right: 0 },
  sea: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sun: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', backgroundColor: 'rgba(242,145,61,0.30)' },
  haloMid: { backgroundColor: 'rgba(255,208,137,0.45)' },
  sunCore: {
    backgroundColor: '#FFF6E2',
    shadowColor: '#FFD089',
    shadowOpacity: 0.95,
    shadowRadius: 42,
    shadowOffset: { width: 0, height: 0 },
  },
  reflection: { position: 'absolute' },
  wave: { position: 'absolute', borderRadius: 4, overflow: 'hidden' },
  waveFill: { flex: 1 },
  // Las frondas nacen apenas fuera de la pantalla, como en el logo: así el
  // tronco no se ve y la hoja parece entrar desde afuera del encuadre.
  palm: { position: 'absolute', top: -30, opacity: 0.98 },
  palmLeft: { left: -20 },
  palmRight: { right: -20 },
  flip: { transform: [{ scaleX: -1 }] },
});
