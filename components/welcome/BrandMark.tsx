import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Marca de Afterdune para la pantalla de bienvenida: el ícono con su
 * resplandor y el logotipo debajo.
 *
 * El logotipo es texto y no una imagen a propósito. Una imagen de 1024px
 * escalada a 180 se ve blanda en pantallas Retina y hay que enviar tres
 * densidades; el texto es nítido en cualquier tamaño, se adapta si el
 * usuario agranda la tipografía del sistema, y los lectores de pantalla lo
 * leen como lo que es.
 */

export function BrandMark() {
  const reducedMotion = useReducedMotion();

  const iconScale = useSharedValue(reducedMotion ? 1 : 0.7);
  const iconOpacity = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    // El ícono entra con un rebote corto y el logotipo lo sigue un instante
    // después: leído en ese orden, la marca "se arma" en lugar de aparecer.
    iconOpacity.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) });
    iconScale.value = withSpring(1, { damping: 11, stiffness: 140 });
  }, [reducedMotion, iconOpacity, iconScale]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <View style={styles.root}>
      {/* El logo real de la marca. Ya trae el nombre adentro, así que acá no
          se repite debajo: duplicarlo se vería como un error de armado. */}
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Image source={require('../../assets/logo-afterdune.png')} style={styles.logo} contentFit="cover" />
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  iconWrap: {
    width: 128,
    height: 128,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,14,22,0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(127,233,255,0.55)',
    // El resplandor cian del logo. En Android `elevation` no tiñe la sombra,
    // así que ahí se pierde: el borde de arriba es lo que mantiene la marca
    // reconocible en las dos plataformas.
    shadowColor: '#22D3EE',
    shadowOpacity: 0.75,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  logo: { width: '100%', height: '100%' },
});
