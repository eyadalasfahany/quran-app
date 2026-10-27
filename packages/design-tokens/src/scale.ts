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

// Fixed sizes the design system states as rules (touch targets, icons) or the frames repeat.
export const size = {
  touchTarget: 44,
  iconSm: 18,
  icon: 22,
  iconMd: 20,
  iconLg: 24,
  ayahMarker: 28,
  focusMarker: 34,
  swatch: 28,
  swatchCheck: 17,
  selectedRingGap: 3,
  grabberWidth: 40,
  grabberHeight: 5,
  sidebar: 300,
  sidePanel: 380,
  // The Mushaf page's double gold rule, and the tighter rule around a surah name.
  frameInset: 6,
  frameRadius: 6,
  frameInnerRadius: 3,
  bandInset: 3,
  bandRadius: 4,
  bandInnerRadius: 2,
} as const;

export const stroke = {
  hairline: 1,
  marker: 1.25,
  swatch: 1.5,
  selectedRing: 2,
  focus: 1.5,
  frame: 1.5,
  frameInner: 0.75,
  activeRule: 3,
  // The outline around a matched word in search results (ADR 0012: matches are outlined, not filled).
  match: 1.5,
} as const;

export const opacity = {
  pressed: 0.7,
  disabled: 0.45,
  grabber: 0.35,
  focusAside: 0.22,
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type SizeToken = keyof typeof size;
