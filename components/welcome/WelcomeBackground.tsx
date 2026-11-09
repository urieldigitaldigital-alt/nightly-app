import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Fondo de la pantalla de bienvenida: la foto del atardecer de la marca, con
 * un acercamiento muy lento.
 *
 * El movimiento es de 1.0 a 1.06 en veinte segundos, ida y vuelta. Es
 * deliberadamente poco: lo justo para que la pantalla no se sienta congelada
 * mientras alguien lee los botones, y no tanto como para que compita con el
 * logo o maree. Una foto quieta se lee como una captura; esta respira.
 *
 * Arriba de la foto van dos veladuras:
 *
 * - Una oscura arriba y abajo, que es la que permite que el texto blanco y
 *   los botones se lean sobre el naranja del sol. Sin ella el titular se
 *   pierde justo en la franja más clara.
 * - Una tenue de color de marca, que tira toda la escena hacia el cian del
 *   logo sin apagar el atardecer.
 *
 * Con "Reducir movimiento" activado la foto queda quieta. No desaparece.
 */
export function WelcomeBackground() {
  const reducedMotion = useReducedMotion();

  const zoom = useSharedValue(1);
  const fadeIn = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    // La foto entra con un fundido corto aunque el movimiento esté
    // desactivado: aparecer de golpe se ve como un salto, no como una
    // animación, y eso no es lo que "reducir movimiento" pide evitar.
    fadeIn.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) });

    if (reducedMotion) return;
    zoom.value = withRepeat(withTiming(1.06, { duration: 20000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [reducedMotion, zoom, fadeIn]);

  const photoStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ scale: zoom.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, photoStyle]}>
        <Image
          source={require('../../assets/welcome-bg.png')}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          // La foto está encuadrada con el sol en el centro: anclarla ahí
          // mantiene el horizonte a la misma altura en un iPhone SE y en un
          // iPad, en vez de recortar por arriba o por abajo.
          contentPosition="center"
          transition={0}
        />
      </Animated.View>

      {/* Veladura de legibilidad */}
      <LinearGradient
        colors={['rgba(2,8,14,0.88)', 'rgba(2,8,14,0.30)', 'rgba(2,8,14,0.42)', 'rgba(2,8,14,0.93)']}
        locations={[0, 0.26, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Tinte de marca, apenas perceptible */}
      <View style={[StyleSheet.absoluteFill, styles.tint]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tint: { backgroundColor: 'rgba(34,211,238,0.07)' },
});
