import { ElementRef, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';
import { resendSignupCode, verifySignupCode } from '@/services/auth';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<ElementRef<typeof TextInput>>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (candidate: string) => {
    if (candidate.length !== CODE_LENGTH || !email || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      const { session } = await verifySignupCode(email, candidate);
      if (session) {
        router.replace('/(auth)/onboarding-profile');
      } else {
        setError('No pudimos confirmar tu cuenta. Probá de nuevo.');
      }
    } catch (e: any) {
      setError(translateVerifyError(e?.message));
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  const handleChangeCode = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) handleVerify(digits);
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0 || resending) return;
    setError(null);
    setResending(true);
    try {
      await resendSignupCode(email);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('No pudimos reenviar el código. Probá de nuevo en un momento.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.iconWrap}>
        <Ionicons name="mail-outline" size={36} color={colors.accent} />
      </View>

      <Text style={styles.title}>Confirmá tu email</Text>
      <Text style={styles.subtitle}>
        Te enviamos un código de 6 dígitos a{'\n'}
        <Text style={styles.email}>{email}</Text>
      </Text>

      <Pressable style={styles.codeRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <View key={i} style={[styles.codeBox, code.length === i && styles.codeBoxActive]}>
            <Text style={styles.codeDigit}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </Pressable>

      {/* Invisible real input — captures typing, paste, and iOS's
          autofill-from-Messages suggestion (textContentType="oneTimeCode"),
          while the boxes above just render its value. Avoids the focus-
          juggling bugs that come with one TextInput per digit. */}
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={handleChangeCode}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoFocus
        maxLength={CODE_LENGTH}
        style={styles.hiddenInput}
      />

      {verifying ? <Text style={styles.hint}>Confirmando...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.resendRow}>
        <Text style={styles.resendText}>¿No te llegó?</Text>
        <Pressable onPress={handleResend} disabled={resendCooldown > 0 || resending} hitSlop={6}>
          <Text style={[styles.resendLink, (resendCooldown > 0 || resending) && styles.resendLinkDisabled]}>
            {resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : resending ? 'Enviando...' : 'Reenviar código'}
          </Text>
        </Pressable>
      </View>

      <Button label="Confirmar" onPress={() => handleVerify(code)} loading={verifying} disabled={code.length !== CODE_LENGTH} />

      <Text style={styles.footer}>¿Es el mail equivocado? Volvé atrás y registrate de nuevo.</Text>
    </Screen>
  );
}

function translateVerifyError(message?: string): string {
  if (!message) return 'Código inválido. Probá de nuevo.';
  if (message.toLowerCase().includes('expired')) return 'El código venció. Pedí uno nuevo.';
  if (message.toLowerCase().includes('invalid')) return 'Código incorrecto. Revisá los 6 dígitos.';
  return 'Código inválido. Probá de nuevo.';
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.sm },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: { color: colors.textPrimary, fontSize: typography.size.xxl, fontWeight: typography.weight.bold, textAlign: 'center' },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.size.md,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  email: { color: colors.textPrimary, fontWeight: typography.weight.semibold },
  codeRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.md },
  codeBox: {
    width: 44,
    height: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBoxActive: { borderColor: colors.accent },
  codeDigit: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  hint: { color: colors.textSecondary, fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.sm },
  error: { color: colors.danger, fontSize: typography.size.sm, textAlign: 'center', marginBottom: spacing.sm },
  resendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xxs, marginBottom: spacing.xl },
  resendText: { color: colors.textMuted, fontSize: typography.size.sm },
  resendLink: { color: colors.accent, fontSize: typography.size.sm, fontWeight: typography.weight.semibold },
  resendLinkDisabled: { color: colors.textMuted },
  footer: { color: colors.textMuted, fontSize: typography.size.xs, textAlign: 'center', marginTop: spacing.lg },
});
