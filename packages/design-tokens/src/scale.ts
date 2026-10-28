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
  // Action tiles and the highlight row in the ayah sheet.
  tile: 16,
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
  // The sheet close glyph. SF Symbol `xmark` at 12 pt draws about 9 pt across, the frame's 18 px svg × (path 6 to 18 of 24).
  closeGlyph: 12,
  icon: 22,
  iconMd: 20,
  iconLg: 24,
  ayahMarker: 28,
  focusMarker: 34,
  swatch: 28,
  swatchCheck: 17,
  selectedRingGap: 3,
  grabberWidth: 40,
  // The Reader settings sheet's narrower grabber.
  grabberWidthCompact: 36,
  grabberHeight: 5,
  grabberRadius: 3,
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
  // The Reader settings grabber (muted variant). Only SheetFrame uses it.
  grabber: 0.4,
  focusAside: 0.22,
  // The gold rosette behind the Continue reading card's text.
  ornament: 0.35,
} as const;

export type SpaceToken = keyof typeof space;
export type RadiusToken = keyof typeof radius;
export type SizeToken = keyof typeof size;
