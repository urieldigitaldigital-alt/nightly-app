import { PropsWithChildren, useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { colors, radii, spacing } from '@/constants/theme';
import { motion } from '@/constants/motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
}>;

// How far down (px) a drag has to go — or how fast it has to be flicked —
// before it counts as "dismiss" instead of "snap back".
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;
const OFFSCREEN_Y = 600;

export function BottomSheetModal({ visible, onClose, children }: Props) {
  if (!visible) return null;
  return <SheetContent onClose={onClose} children={children} />;
}

// Split out so every mount starts with fresh shared values — visible=false
// fully unmounts the sheet (see above), so there's no stale drag state to
// reset between opens.
function SheetContent({ onClose, children }: PropsWithChildren<{ onClose: () => void }>) {
  const reducedMotion = useReducedMotion();
  const translateY = useSharedValue(reducedMotion ? 0 : OFFSCREEN_Y);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = reducedMotion ? 0 : withSpring(0, motion.releaseSpring);
    backdropOpacity.value = withTiming(1, { duration: reducedMotion ? 0 : 220 });
    // Mount-only entrance animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    backdropOpacity.value = withTiming(0, { duration: reducedMotion ? 0 : 180 });
    if (reducedMotion) {
      onClose();
      return;
    }
    translateY.value = withTiming(OFFSCREEN_Y, { duration: 200, easing: motion.moveEasing }, (finished) => {
      if (finished) runOnJS(onClose)();
    });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        translateY.value = withTiming(OFFSCREEN_Y, { duration: 180 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, motion.releaseSpring);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));

  return (
    <Modal transparent animationType="none" visible onRequestClose={close}>
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar">
          <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.backdropTint]} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />
            {children}
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropTint: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceRaised,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
});
