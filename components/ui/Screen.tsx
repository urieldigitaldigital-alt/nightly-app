import { PropsWithChildren } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';

type Props = PropsWithChildren<{
  edges?: Edge[];
  style?: ViewStyle;
  padded?: boolean;
  /**
   * Centra el contenido en una columna de ancho legible cuando la ventana es
   * ancha (iPad, iPad rotado, navegador de escritorio).
   *
   * Es el valor por defecto para cualquier pantalla con `padded`: un
   * formulario o un texto estirado a 1300pt de ancho es ilegible, y la app
   * corre a pantalla completa en tablet y web. Las pantallas que de verdad
   * quieren todo el ancho — mapa, galerías, feeds en grilla — pasan
   * `fullBleed`.
   */
  fullBleed?: boolean;
}>;

export function Screen({ children, edges = ['top'], style, padded = false, fullBleed = false }: Props) {
  const { isWide, readingWidth, gutter } = useResponsive();

  // Solo entra en juego en pantallas anchas: en teléfono el contenido ya
  // ocupa todo y envolverlo en otra View sería una capa de más.
  const constrain = padded && isWide && !fullBleed;

  return (
    <SafeAreaView edges={edges} style={[styles.root, style]}>
      {constrain ? (
        <View style={styles.centerRow}>
          <View style={[styles.column, { maxWidth: readingWidth, paddingHorizontal: gutter }]}>{children}</View>
        </View>
      ) : (
        <View style={[styles.fill, padded && { paddingHorizontal: gutter }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: { flex: 1 },
  centerRow: { flex: 1, alignItems: 'center' },
  column: { flex: 1, width: '100%' },
});
