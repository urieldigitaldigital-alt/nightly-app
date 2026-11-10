import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'light';
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
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'light' ? colors.accentText : colors.textPrimary} />
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
});

const sizeStyles = StyleSheet.create({
  md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  lg: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent },
  // Translucido, con borde blanco y no cian: en la bienvenida estos botones
  // van encima del atardecer, un bloque opaco taparia la foto y un contorno
  // de color se leia como neon.
  secondary: {
    backgroundColor: 'rgba(10,16,22,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  outline: {
    backgroundColor: 'rgba(10,16,22,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  // Blanco solido con texto oscuro. Es el formato que piden tanto Google
  // como Apple para sus botones de inicio de sesion sobre fondos oscuros, y
  // ademas los despega de la foto de la bienvenida, donde un boton
  // translucido se perdia contra el atardecer.
  light: { backgroundColor: '#FFFFFF' },
});

const labelVariantStyles = StyleSheet.create({
  primary: { color: colors.accentText },
  secondary: { color: colors.textPrimary },
  outline: { color: colors.textPrimary },
  ghost: { color: colors.textSecondary },
  danger: { color: colors.white },
  light: { color: '#1F2328' },
});
