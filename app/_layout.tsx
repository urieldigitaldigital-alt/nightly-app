import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';
import { LoadingState } from '@/components/ui/LoadingState';
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
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  usePushNotifications(Boolean(session) && onboardingCompleted);

  useEffect(() => {
    if (!loading && !appReady) {
      setAppReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading, appReady]);

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

  if (loading) {
    return <LoadingState fullscreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="event/[id]/index" options={{ presentation: 'card' }} />
            <Stack.Screen name="event/create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
