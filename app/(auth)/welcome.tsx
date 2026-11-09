import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Linking, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';
import { WelcomeBackground } from '@/components/welcome/WelcomeBackground';
import { BrandMark } from '@/components/welcome/BrandMark';
import { brand } from '@/constants/brand';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { signInWithApple, signInWithGoogle } from '@/services/auth';
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
  // Not useWindowDimensions(): that reports the raw browser window size,
  // but app/_layout.tsx now caps the app itself at a narrower centered
  // column on web — slides sized to the full window overflowed past the
  // actual visible frame. Measuring this view's own rendered width instead
  // is correct regardless of any ancestor's width constraint.
  const [width, setWidth] = useState(0);
  const onFrameLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const [activeIndex, setActiveIndex] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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

  const handleApple = async () => {
    clearOAuthError();
    setGoogleError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      setGoogleError('No pudimos conectar con Apple. Probá de nuevo.');
    } finally {
      setAppleLoading(false);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <WelcomeBackground />

      <View style={styles.brandHeader}>
        <BrandMark />
      </View>

      <View style={styles.carouselFrame} onLayout={onFrameLayout}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide) => (
            <View key={slide.title} style={[styles.slide, { width }]}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

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
        <AppleSignInButton onPress={handleApple} loading={appleLoading} />
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button label="Crear cuenta" onPress={() => router.push('/(auth)/register')} />
        <Button label="Ya tengo cuenta" variant="outline" onPress={() => router.push('/(auth)/login')} />

        {/* Entrar con Google o con Apple crea la cuenta sin pasar por el
            formulario de registro, así que las casillas de aceptación de esa
            pantalla nunca se ven en ese camino. Esta línea es donde esos dos
            caminos aceptan lo mismo, y por eso está acá abajo y no dentro
            del formulario. */}
        <Text style={styles.legal}>
          Al continuar aceptás los{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(brand.termsUrl)}>
            Términos de uso
          </Text>
          , la{' '}
          <Text style={styles.legalLink} onPress={() => Linking.openURL(brand.privacyUrl)}>
            Política de privacidad
          </Text>{' '}
          y las{' '}
          <Text style={styles.legalLink} onPress={() => router.push('/community-guidelines')}>
            Normas de la comunidad
          </Text>
          , con tolerancia cero al contenido objetable.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  carouselFrame: { flex: 1 },
  brandHeader: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.xs },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    // Sobre el fondo del atardecer el texto plano se pierde contra el naranja.
    // La sombra lo despega sin tener que oscurecer la foto entera.
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
  body: {
    color: '#D6E6EF',
    fontSize: typography.size.md,
    textAlign: 'center',
    lineHeight: 22,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 1 },
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
  legal: {
    color: colors.textMuted,
    fontSize: typography.size.xs,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  legalLink: { color: colors.textSecondary, textDecorationLine: 'underline' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.xxs },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: typography.size.xs },
  googleError: { color: colors.danger, fontSize: typography.size.sm, textAlign: 'center' },
});
