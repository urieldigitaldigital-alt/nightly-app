import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { accentGradient, colors, radii, shadows, spacing, typography } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  testID?: string;
  /** Light haptic on press — on by default for the two "important action"
   * variants, off for secondary/outline/ghost so every tap in the app
   * doesn't buzz. */
  haptic?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function fireHaptic() {
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

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = true,
  testID,
  haptic = variant === 'primary' || variant === 'danger',
}: Props) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      testID={testID}
      onPress={isDisabled ? undefined : onPress}
      onPressIn={() => {
        if (reducedMotion) return;
        scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration, easing: motion.moveEasing });
        if (haptic) fireHaptic();
      }}
      onPressOut={() => {
        scale.value = reducedMotion ? 1 : withSpring(1, motion.releaseSpring);
      }}
      style={[
        animatedStyle,
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {/* El degradé va como capa de fondo y no como `backgroundColor` del
          propio botón. Si se envolviera el botón en el degradé habría que
          recortar con `overflow: 'hidden'`, y en iOS eso recorta también la
          sombra, que es justo el resplandor que se busca acá. */}
      {variant === 'primary' && !isDisabled ? (
        <LinearGradient
          colors={[...accentGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
          pointerEvents="none"
        />
      ) : null}

      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.textPrimary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, labelVariantStyles[variant]]}>{label}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
  },
  disabled: {
    opacity: 0.45,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.pill,
  },
});

const sizeStyles = StyleSheet.create({
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
});

const variantStyles = StyleSheet.create({
  // El color sólido queda abajo del degradé: es lo que se ve cuando el botón
  // está deshabilitado (ahí la capa del degradé no se dibuja) y en cualquier
  // caso en que `expo-linear-gradient` tarde un frame en montar.
  primary: { backgroundColor: colors.accent, ...shadows.glow },
  // Translúcido y con borde cian en vez de un gris sólido: en la pantalla de
  // bienvenida estos botones van encima del atardecer, y un bloque opaco
  // taparía la foto. Dentro de la app, sobre fondo negro, el resultado es
  // prácticamente el mismo gris de antes.
  secondary: {
    backgroundColor: 'rgba(10,22,32,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
  },
  outline: {
    backgroundColor: 'rgba(10,22,32,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.45)',
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
});

const labelVariantStyles = StyleSheet.create({
  primary: { color: colors.accentText },
  secondary: { color: colors.textPrimary },
  outline: { color: colors.textPrimary },
  ghost: { color: colors.textSecondary },
  danger: { color: colors.white },
});
