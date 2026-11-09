import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/constants/theme';
import { brand } from '@/constants/brand';
import { useReducedMotion } from '@/hooks/useReducedMotion';

type Props = {
  /** True once real app data (session) is ready — the exit only plays after
   * both the animation's own minimum duration AND this are true, so a slow
   * network doesn't cut the animation short but also never waits longer
   * than necessary once data is actually ready. */
  ready: boolean;
  onFinish: () => void;
};

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Cold-start intro — deliberately matches the native splash screen
 * (expo-splash-screen: same #080808 background, same logo, same size/
 * position) pixel-for-pixel on its very first frame, so hiding the native
 * splash and mounting this is an invisible handoff instead of a flash/swap.
 * Only ever shown once per cold start (app/_layout.tsx only mounts this
 * before the first real screen, never again on backgrounding/resume). */
export function SplashAnimation({ ready, onFinish }: Props) {
  const reducedMotion = useReducedMotion();
  const logoScale = useSharedValue(0.6);
  const logoOpacity = useSharedValue(0);
  const ring1Scale = useSharedValue(0.8);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(0.8);
  const ring2Opacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleOffset = useSharedValue(8);
  const finishedRef = useRef(false);

  // The effect below only runs once (mount) and drives a long async
  // sequence — reading the `ready` prop directly would close over its
  // mount-time value forever, so the "wait until ready" loops poll this
  // ref instead, which always has the latest value.
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    let cancelled = false;

    async function waitUntilReady() {
      while (!readyRef.current) {
        await sleep(50);
        if (cancelled) return;
      }
    }

    async function run() {
      if (reducedMotion) {
        logoScale.value = 1;
        logoOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
        await sleep(500);
        if (cancelled) return;
        await waitUntilReady();
        if (cancelled) return;
        logoOpacity.value = withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) });
        await sleep(300);
        if (!cancelled && !finishedRef.current) {
          finishedRef.current = true;
          onFinish();
        }
        return;
      }

      // 0.00–0.45s: logo scales in with a light spring overshoot.
      logoScale.value = withSpring(1, { damping: 9, stiffness: 160, mass: 0.9 });
      logoOpacity.value = withTiming(1, { duration: 300 });

      await sleep(250);
      if (cancelled) return;
      // 0.25–0.85s: two concentric pulses, staggered — the same "you are
      // here" pulse used for the live-location dot on the map, so the
      // intro visually connects to the rest of the app.
      ring1Opacity.value = withSequence(withTiming(0.35, { duration: 10 }), withTiming(0, { duration: 590, easing: Easing.out(Easing.ease) }));
      ring1Scale.value = withTiming(2.4, { duration: 600, easing: Easing.out(Easing.ease) });

      await sleep(150);
      if (cancelled) return;
      ring2Opacity.value = withSequence(withTiming(0.35, { duration: 10 }), withTiming(0, { duration: 590, easing: Easing.out(Easing.ease) }));
      ring2Scale.value = withTiming(2.4, { duration: 600, easing: Easing.out(Easing.ease) });

      await sleep(100);
      if (cancelled) return;
      // 0.50–0.80s: name fades up under the logo.
      titleOpacity.value = withTiming(1, { duration: 300 });
      titleOffset.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });

      await sleep(350);
      if (cancelled) return;
      fireHaptic();

      await sleep(100);
      if (cancelled) return;

      // Animation's own choreography is done around ~1.0s in. If real data
      // isn't ready yet, hold here with a slow breathing pulse instead of
      // just freezing — never blocks longer than the data actually takes.
      if (!readyRef.current) {
        ring1Scale.value = 1;
        ring1Opacity.value = withRepeat(withSequence(withTiming(0.2, { duration: 700 }), withTiming(0, { duration: 700 })), -1, false);
        await waitUntilReady();
        if (cancelled) return;
        cancelAnimation(ring1Opacity);
        ring1Opacity.value = withTiming(0, { duration: 150 });
      }

      // Exit: logo punches slightly larger and fades; the real screen
      // underneath fades/scales in to meet it (handled by the parent).
      logoScale.value = withTiming(1.15, { duration: 400, easing: Easing.in(Easing.ease) });
      logoOpacity.value = withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) });
      titleOpacity.value = withTiming(0, { duration: 250 });

      await sleep(400);
      if (!cancelled && !finishedRef.current) {
        finishedRef.current = true;
        onFinish();
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // Runs once by design — see readyRef above for how it still reacts to
    // `ready` changing without restarting the whole sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));
  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleOffset.value }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.ring, ring1Style]} />
      <Animated.View style={[styles.ring, ring2Style]} />
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={require('../assets/splash-icon.png')} style={styles.logo} contentFit="contain" />
        </Animated.View>
        <Animated.Text style={[styles.title, titleStyle]}>{brand.name}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  center: { alignItems: 'center', gap: 16 },
  // El radio es el 22% del lado, que es la proporción que usa iOS para el
  // ícono de app. Sin esto el logo cae cuadrado sobre los dos círculos que
  // animan detrás y el conjunto se ve mal armado.
  logo: { width: 120, height: 120, borderRadius: 26 },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.accent,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
