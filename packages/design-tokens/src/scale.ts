// Values from quran-app-design-system.html until the Figma variables can be read (ADR 0005).
// Same in every theme.

export const space = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const blur = {
  glass: 24,
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
