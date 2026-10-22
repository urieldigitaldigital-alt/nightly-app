/**
 * Design tokens for NIGHTLY.
 * Everything brand-specific (name, colors, accent) lives in this one file and
 * `constants/brand.ts` so the identity can be swapped without touching screens.
 */

export const palette = {
  black: '#080808',
  blackSecondary: '#121212',
  grayDark: '#1B1B1B',
  grayMid: '#2A2A2E',
  grayLine: '#262629',
  white: '#FFFFFF',
  grayLight: '#A1A1AA',
  grayMuted: '#6B6B70',
  accent: '#C8FF4D',
  accentDim: '#9ED92F',
  danger: '#FF5C5C',
  warning: '#FFB84D',
  success: '#4DD98C',
} as const;

export const colors = {
  background: palette.black,
  surface: palette.blackSecondary,
  surfaceAlt: palette.grayDark,
  surfaceRaised: palette.grayMid,
  border: palette.grayLine,
  white: palette.white,
  textPrimary: palette.white,
  textSecondary: palette.grayLight,
  textMuted: palette.grayMuted,
  accent: palette.accent,
  accentText: palette.black,
  danger: palette.danger,
  warning: palette.warning,
  success: palette.success,
  overlay: 'rgba(8,8,8,0.72)',
} as const;

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

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
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
