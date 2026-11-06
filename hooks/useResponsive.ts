import { useWindowDimensions } from 'react-native';

/**
 * Un único lugar donde se decide cómo cambia el layout según el tamaño de la
 * ventana — teléfono, tablet, tablet rotada, navegador de escritorio.
 *
 * Se apoya en `useWindowDimensions` y no en `Dimensions.get()` porque el
 * tamaño no es un dato fijo: cambia al rotar un iPad, al entrar en Split View
 * y al redimensionar la ventana del navegador. El hook re-renderiza solo en
 * esos casos.
 *
 * El ancho de breakpoint se mide contra el lado corto de la ventana y no
 * contra el ancho real. Un iPhone acostado tiene más de 800pt de ancho pero
 * sigue siendo un teléfono: con dos columnas ahí, las tarjetas quedarían
 * aplastadas contra una altura de 390pt.
 */

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/** Ancho mínimo (en el lado corto) para considerar que hay espacio de tablet. */
const TABLET_MIN = 600;
const DESKTOP_MIN = 1024;

/**
 * Ancho máximo de una columna de texto. Más allá de ~700pt la línea se vuelve
 * tan larga que el ojo pierde el renglón al volver — es el motivo por el que
 * los formularios y las pantallas de lectura se centran en vez de estirarse.
 */
export const READING_MAX_WIDTH = 680;

/** Ancho objetivo de una tarjeta de fiesta; define cuántas columnas entran. */
const CARD_TARGET_WIDTH = 360;

export type Responsive = {
  width: number;
  height: number;
  isLandscape: boolean;
  breakpoint: Breakpoint;
  /** `true` en tablet y escritorio — el atajo más usado en las pantallas. */
  isWide: boolean;
  /** Columnas recomendadas para una grilla de tarjetas. */
  columns: number;
  /** Padding horizontal de pantalla, más generoso cuanto más ancha. */
  gutter: number;
  /** Ancho máximo para contenido de lectura, ya acotado al de la ventana. */
  readingWidth: number;
};

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  const shortSide = Math.min(width, height);
  const isLandscape = width > height;

  const breakpoint: Breakpoint = shortSide >= DESKTOP_MIN ? 'desktop' : shortSide >= TABLET_MIN ? 'tablet' : 'phone';
  const isWide = breakpoint !== 'phone';

  // En teléfono siempre una columna, aunque esté acostado. En el resto, las
  // que entren con un ancho de tarjeta cómodo, con un techo de 3: más
  // columnas empiezan a parecer una planilla y no un feed.
  const columns = isWide ? Math.max(1, Math.min(3, Math.floor(width / CARD_TARGET_WIDTH))) : 1;

  const gutter = breakpoint === 'desktop' ? 32 : breakpoint === 'tablet' ? 24 : 20;

  return {
    width,
    height,
    isLandscape,
    breakpoint,
    isWide,
    columns,
    gutter,
    readingWidth: Math.min(READING_MAX_WIDTH, width),
  };
}
