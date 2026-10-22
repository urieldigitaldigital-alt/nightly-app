import { useEffect, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { brand } from '@/constants/brand';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { signInWithGoogle } from '@/services/auth';
import { useAuthStore } from '@/stores/authStore';

const SLIDES = [
  {
    icon: 'compass-outline' as const,
    title: 'Descubrí qué pasa cerca tuyo',
    body: 'Previas, fiestas y eventos en Pinamar, Cariló, Gesell y toda la Costa dentro del radio que vos elijas.',
  },
  {
    icon: 'checkmark-done-circle-outline' as const,
    title: 'Pedí acceso, confirmá tu lugar',
    body: 'Solicitá asistir y el organizador te acepta. Recién ahí se desbloquea la info de acceso.',
  },
  {
    icon: 'navigate-outline' as const,
    title: 'Llegá sin perderte',
    body: 'Una vez confirmado, chat directo con el organizador y navegación real hasta la puerta.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const oauthError = useAuthStore((s) => s.oauthError);
  const clearOAuthError = useAuthStore((s) => s.clearOAuthError);

  // A failed Google redirect (denied, misconfigured redirect URL, etc.)
  // lands back here with no session — authStore already pulled the real
  // reason out of the URL before the router guard could strip it.
  useEffect(() => {
    if (oauthError) setGoogleError(oauthError);
  }, [oauthError]);

  const handleGoogle = async () => {
    clearOAuthError();
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // app/_layout.tsx's guard takes it from here once the session lands.
    } catch (e: any) {
      setGoogleError('No pudimos conectar con Google. Probá de nuevo.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.brandRow}>
        <Text style={styles.brandDot}>●</Text>
        <Text style={styles.brandName}>{brand.name}</Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <View style={styles.iconWrapper}>
              <Ionicons name={slide.icon} size={52} color={colors.accent} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View key={slide.title} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        {googleError ? <Text style={styles.googleError}>{googleError}</Text> : null}
        <Button
          label="Continuar con Google"
          variant="secondary"
          onPress={handleGoogle}
          loading={googleLoading}
          icon={<Ionicons name="logo-google" size={18} color={colors.textPrimary} />}
        />
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button label="Crear cuenta" onPress={() => router.push('/(auth)/register')} />
        <Button label="Ya tengo cuenta" variant="outline" onPress={() => router.push('/(auth)/login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  brandDot: { color: colors.accent, fontSize: 10 },
  brandName: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    letterSpacing: 2,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 18,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xxs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: typography.size.xs },
  googleError: { color: colors.danger, fontSize: typography.size.sm, textAlign: 'center' },
});
