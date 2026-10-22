// Web build stub: react-native-maps has no web implementation (it crashes
// the bundle via codegenNativeComponent). The real map only renders on
// iOS/Android — see PlatformMap.native.tsx. This keeps the rest of the app
// usable in a browser for preview purposes.
import { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';
import { colors, radii, spacing, typography } from '@/constants/theme';

export default function PlatformMapWebStub({ style, children }: PropsWithChildren<ViewProps>) {
  return (
    <View style={[styles.root, style]}>
      <Text style={styles.title}>El mapa solo está disponible en la app móvil</Text>
      <Text style={styles.body}>react-native-maps es una librería nativa — abrí esta pantalla desde Expo Go o un build nativo para verla.</Text>
      {children}
    </View>
  );
}

export function Marker(_props: unknown) {
  return null;
}

export function Polyline(_props: unknown) {
  return null;
}

export const PROVIDER_GOOGLE = 'google';

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.size.md,
    fontWeight: typography.weight.semibold,
    textAlign: 'center',
  },
  body: {
    color: colors.textMuted,
    fontSize: typography.size.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
});
