import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';
import { SplashAnimation } from '@/components/SplashAnimation';
import { usePushNotifications } from '@/hooks/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const loading = useAuthStore((s) => s.loading);
  const session = useAuthStore((s) => s.session);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const birthdateConfirmed = useAuthStore((s) => s.birthdateConfirmed);
  const segments = useSegments();
  const router = useRouter();
  const [introDone, setIntroDone] = useState(false);
  const contentOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.97);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  usePushNotifications(Boolean(session) && onboardingCompleted);

  useEffect(() => {
    // The native static splash (expo-splash-screen) matches SplashAnimation's
    // very first frame exactly (same background, same logo, same position),
    // so swapping one for the other here is invisible — this is what lets
    // the custom animation actually run instead of sitting hidden behind
    // the native splash for the whole loading period.
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const handleIntroFinish = () => {
    setIntroDone(true);
    contentOpacity.value = withTiming(1, { duration: 300 });
    contentScale.value = withTiming(1, { duration: 300 });
  };

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }],
  }));

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    // Public route: reached via the password-reset email link, which may or
    // may not carry a valid session (expired/already-used links land here
    // with none) — the screen itself handles both cases, so the guard must
    // not redirect away before it gets to render that.
    const isPublicRoute = segments[0] === 'reset-password';

    if (!session && !inAuthGroup && !isPublicRoute) {
      router.replace('/(auth)/welcome');
    } else if (session && !birthdateConfirmed && !inAuthGroup && !isPublicRoute) {
      // Google sign-in never gives us a real birthdate — this screen is
      // where that gets collected for real before the user goes any further.
      router.replace('/(auth)/confirm-birthdate');
    } else if (session && birthdateConfirmed && !onboardingCompleted && !inAuthGroup && !isPublicRoute) {
      router.replace('/(auth)/onboarding-interests');
    } else if (session && birthdateConfirmed && onboardingCompleted && inAuthGroup) {
      router.replace('/(tabs)/discover');
    }
  }, [loading, session, onboardingCompleted, birthdateConfirmed, segments, router]);

  return (
    // On a wide browser window the mobile-first layouts here stretch edge
    // to edge and everything (absolute-positioned icons, full-width
    // buttons) ends up misaligned and oversized — capping the app at a
    // phone-sized column and centering it keeps it looking like a real app
    // on web regardless of window width. Native screens are already
    // narrower than this cap, so it's a no-op there except on tablets.
    <View style={styles.webBackdrop}>
      <GestureHandlerRootView style={styles.webFrame}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="light" />
            {/* Mounted immediately (not gated on `loading`) so data starts
                fetching right away — the splash overlay below covers it
                visually until both the intro animation and auth state are
                ready, so there's nothing to see prematurely either way. */}
            <Animated.View style={[styles.content, contentStyle]}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                  // iOS-style slide-in-from-the-right with the reverse on
                  // back — react-native-screens' native-stack already does
                  // this on iOS/Android by default, this just makes it
                  // explicit and asks for it on web too (where there was no
                  // transition at all otherwise).
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="event/[id]/index" options={{ presentation: 'card' }} />
                <Stack.Screen name="event/create" options={{ presentation: 'modal' }} />
                <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
              </Stack>
            </Animated.View>
            {!introDone && <SplashAnimation ready={!loading} onFinish={handleIntroFinish} />}
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  webBackdrop: { flex: 1, alignItems: 'center', backgroundColor: colors.background },
  webFrame: { flex: 1, width: '100%', maxWidth: 480 },
  content: { flex: 1 },
});
