/**
 * Design tokens for Afterdune.
 * Everything brand-specific (name, colors, accent) lives in this one file and
 * `constants/brand.ts` so the identity can be swapped without touching screens.
 */

// Los grises no son neutros: todos tiran apenas al azul. Sobre un fondo que
// va a estar casi siempre debajo de fotos nocturnas y del mapa oscuro, un
// gris neutro se ve sucio al lado del cian; estos lo acompañan.
// Los fondos subieron desde un casi negro (#05070A) a este carbón. El negro
// puro contra el cian saturado daba el contraste más alto posible, y eso es
// justo lo que hacía que el azul "saltara" y que todo se leyera como neón.
// Con los grises un poco más claros el mismo cian se apoya en vez de vibrar,
// y la pantalla deja de parecer una consola de ciencia ficción.
export const palette = {
  black: '#0C1116',
  blackSecondary: '#141B23',
  grayDark: '#1B242E',
  grayMid: '#24303C',
  grayLine: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  grayLight: '#A3B1C2',
  grayMuted: '#64748B',
  // Cian tomado del logo: el resplandor del borde, el mar y el trazo bajo
  // "Afterdune". Reemplazó a un verde lima (#C8FF4D) que no salía de ningún
  // lado de la identidad.
  accent: '#22D3EE',
  accentDim: '#0E9FB8',
  // El azul del final del degradé del swoosh del logo. El acento nunca va
  // plano en superficies grandes: va de cian a este azul.
  accentDeep: '#0EA5E9',
  danger: '#F87171',
  warning: '#FBBF24',
  success: '#34D399',
} as const;

export const colors = {
  background: palette.black,
  surface: palette.blackSecondary,
  surfaceAlt: palette.grayDark,
  surfaceRaised: palette.grayMid,
  border: palette.grayLine,
  // Solo para lo seleccionado o enfocado. Un borde cian en todas las cards
  // haría que nada se destaque.
  borderStrong: 'rgba(34,211,238,0.35)',
  white: palette.white,
  textPrimary: palette.white,
  textSecondary: palette.grayLight,
  textMuted: palette.grayMuted,
  accent: palette.accent,
  accentDeep: palette.accentDeep,
  accentSoft: 'rgba(34,211,238,0.12)',
  // Casi negro con un resto de azul, no negro puro: sobre el cian saturado
  // el negro puro vibra.
  accentText: '#031016',
  danger: palette.danger,
  warning: palette.warning,
  success: palette.success,
  overlay: 'rgba(5,7,10,0.72)',
} as const;

/** Degradé del acento, en el orden que esperan `expo-linear-gradient` y SVG. */
export const accentGradient = [palette.accent, palette.accentDeep] as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

// Radios moderados. Estuvieron en 12/18/24/32 y era demasiado: con todo muy
// redondeado las cards dejan de leerse como contenido y empiezan a leerse
// como globos. Estos valores están cerca de los que usa el propio sistema en
// iOS, que es la referencia correcta para una app que quiere pasar por
// nativa.
export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

/**
 * Sombra de card, contenida.
 *
 * Sobre un fondo oscuro una sombra negra casi no se ve: lo que separa una
 * superficie de otra es el cambio de color, no la sombra. Queda suave y solo
 * para lo que de verdad flota por encima del contenido.
 *
 * Ya no hay sombra de resplandor. El cian se distingue por ser el único
 * color saturado de la pantalla, no por brillar; los halos de colores
 * alrededor de los botones son lo primero que delata a una app que no
 * diseñó nadie.
 */
export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
} as const;

export const typography = {
  family: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  size: {
    xs: 12,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 32,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const durations = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export const layout = {
  screenPadding: spacing.lg,
  cardRadius: radii.lg,
  tabBarHeight: 64,
} as const;

export type Colors = typeof colors;
