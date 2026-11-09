import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = PressableProps & {
  style?: StyleProp<ViewStyle>;
  /** Cuánto se encoge al apretar. Lo chico (chips, botones de ícono) necesita
   * encogerse menos para que el gesto no se lea como un salto. */
  scaleTo?: number;
  children?: React.ReactNode;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Cualquier cosa tocable que tenga que responder al dedo.
 *
 * Existe porque esta animación —encoger al apretar, volver con un resorte—
 * la necesitan las cards, las filas, los chips y la cuadrícula de accesos
 * rápidos, y tenerla copiada en cada uno garantizaba que con el tiempo
 * dejaran de coincidir. Respeta "Reducir movimiento": ahí no se encoge, pero
 * el toque sigue funcionando igual.
 */
export function PressableScale({ style, scaleTo = motion.pressScale, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        if (!reducedMotion) {
          scale.value = withTiming(scaleTo, { duration: motion.pressDuration, easing: motion.moveEasing });
        }
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = reducedMotion ? 1 : withSpring(1, motion.releaseSpring);
        rest.onPressOut?.(e);
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
