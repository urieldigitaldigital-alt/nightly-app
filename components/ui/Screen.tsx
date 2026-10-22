import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

type Props = PropsWithChildren<{
  edges?: Edge[];
  style?: ViewStyle;
  padded?: boolean;
}>;

export function Screen({ children, edges = ['top'], style, padded = false }: Props) {
  return (
    <SafeAreaView edges={edges} style={[styles.root, padded && styles.padded, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  padded: {
    paddingHorizontal: 20,
  },
});
