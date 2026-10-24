import { useEffect } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, radii } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** A single shimmering placeholder block — compose a few of these into a
 * *Skeleton component shaped like the real content (see EventCardSkeleton)
 * so loading reads as "this is about to appear" instead of a blank screen. */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(0.45);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 0.55;
      return;
    }
    opacity.value = withRepeat(withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.base, animatedStyle, style]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.surfaceRaised, borderRadius: radii.sm },
});
