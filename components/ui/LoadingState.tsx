import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

export function LoadingState({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <View style={[styles.root, fullscreen && styles.fullscreen]}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
