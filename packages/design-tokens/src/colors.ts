// Values from quran-app-design-system.html until the Figma variables can be read (ADR 0005).
// Aliases are resolved: focusRing = brand, glassFallback = surfaceRaised.

export const themeNames = ['light', 'sepia', 'dark'] as const;

export type ThemeName = (typeof themeNames)[number];

export type ColorTokens = {
  surface: string;
  surfacePage: string;
  surfaceRaised: string;
  line: string;
  ink: string;
  inkMuted: string;
  brand: string;
  onBrand: string;
  brandSurface: string;
  onBrandSurface: string;
  gold: string;
  goldInk: string;
  highlightActive: string;
  highlightGold: string;
  highlightGreen: string;
  highlightBlue: string;
  highlightRose: string;
  danger: string;
  fillSecondary: string;
  /** Segmented-control and stepper track (quran-app-screens.html, Reader settings). */
  fillTrack: string;
  lineStrong: string;
  onBrandSurfaceMuted: string;
  goldOnBrandSurface: string;
  chartBlue: string;
  chartGray: string;
  playerLine: string;
  focusRing: string;
  glassFill: string;
  glassStroke: string;
  glassSelected: string;
  glassFallback: string;
  scrim: string;
  playerBg: string;
  playerInk: string;
  playerMuted: string;
  playerAccent: string;
};

export type ShadowTokens = {
  glass: string;
  raised: string;
};

export const colors: Record<ThemeName, ColorTokens> = {
  light: {
    surface: '#f7f3ea',
    surfacePage: '#fbf8f1',
    surfaceRaised: '#fffdf8',
    line: '#e7dfcc',
    ink: '#13231f',
    inkMuted: '#5b6a64',
    brand: '#1f4d40',
    onBrand: '#f7f3ea',
    brandSurface: '#1f4d40',
    onBrandSurface: '#f7f3ea',
    gold: '#a07c33',
    goldInk: '#7e5f1e',
    highlightActive: '#ecece5',
    highlightGold: '#f3e3b5',
    highlightGreen: '#c4dfcc',
    highlightBlue: '#b7cde6',
    highlightRose: '#e8b9b9',
    danger: '#a3392b',
    fillSecondary: '#efe8d8',
    fillTrack: 'rgba(19, 35, 31, 0.06)',
    lineStrong: '#d9d0bc',
    onBrandSurfaceMuted: '#d9e2dd',
    goldOnBrandSurface: '#c9a961',
    chartBlue: '#4f86a8',
    chartGray: '#78877f',
    playerLine: '#24352f',
    focusRing: '#1f4d40',
    glassFill: 'rgba(255, 253, 248, 0.72)',
    glassStroke: 'rgba(255, 255, 255, 0.75)',
    glassSelected: 'rgba(31, 77, 64, 0.10)',
    glassFallback: '#fffdf8',
    scrim: 'rgba(19, 35, 31, 0.40)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
  },
  sepia: {
    surface: '#f1e6cf',
    surfacePage: '#f4ead5',
    surfaceRaised: '#f8efdc',
    line: '#e0d0b0',
    ink: '#2b2116',
    inkMuted: '#6b5a44',
    brand: '#1f4d40',
    onBrand: '#f7f3ea',
    brandSurface: '#1f4d40',
    onBrandSurface: '#f7f3ea',
    gold: '#8c6a2b',
    goldInk: '#6e521c',
    highlightActive: '#e5dfcb',
    highlightGold: '#ead39b',
    highlightGreen: '#c3d6b4',
    highlightBlue: '#b4c9d1',
    highlightRose: '#e2b6a6',
    danger: '#963425',
    fillSecondary: '#e8dcc2',
    fillTrack: 'rgba(43, 33, 22, 0.06)',
    lineStrong: '#cfbf9f',
    onBrandSurfaceMuted: '#d9e2dd',
    goldOnBrandSurface: '#c9a961',
    chartBlue: '#4f86a8',
    chartGray: '#78877f',
    playerLine: '#24352f',
    focusRing: '#1f4d40',
    glassFill: 'rgba(248, 239, 220, 0.72)',
    glassStroke: 'rgba(255, 250, 238, 0.75)',
    glassSelected: 'rgba(31, 77, 64, 0.10)',
    glassFallback: '#f8efdc',
    scrim: 'rgba(43, 33, 22, 0.40)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
  },
  dark: {
    surface: '#0e1715',
    surfacePage: '#121d1a',
    surfaceRaised: '#172421',
    line: '#2a3a34',
    ink: '#ece6d8',
    inkMuted: '#a7b3ad',
    brand: '#8cc5af',
    onBrand: '#0e1715',
    brandSurface: '#1f4d40',
    onBrandSurface: '#f7f3ea',
    gold: '#c9a961',
    goldInk: '#e6c77e',
    highlightActive: '#2b2f2d',
    highlightGold: '#3d3519',
    highlightGreen: '#1e3a2e',
    highlightBlue: '#1e2d3f',
    highlightRose: '#3f2427',
    danger: '#f0a493',
    fillSecondary: '#24342f',
    fillTrack: 'rgba(236, 230, 216, 0.06)',
    lineStrong: '#3c4f48',
    onBrandSurfaceMuted: '#d9e2dd',
    goldOnBrandSurface: '#c9a961',
    chartBlue: '#7fb0cf',
    chartGray: '#8a9a93',
    playerLine: '#24352f',
    focusRing: '#8cc5af',
    glassFill: 'rgba(23, 36, 33, 0.62)',
    glassStroke: 'rgba(255, 255, 255, 0.14)',
    glassSelected: 'rgba(140, 197, 175, 0.16)',
    glassFallback: '#172421',
    scrim: 'rgba(0, 0, 0, 0.55)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
  },
};

// Increase Contrast overrides per theme (iOS isDarkerSystemColorsEnabled, Android isHighTextContrastEnabled).
// The theme stays the app's choice; these replace a few of its values.
export type HighContrastTokens = Pick<ColorTokens, 'line' | 'lineStrong' | 'inkMuted' | 'glassStroke'>;

export const highContrast: Record<ThemeName, HighContrastTokens> = {
  light: { line: '#8a816d', lineStrong: '#787060', inkMuted: '#44524d', glassStroke: 'rgba(19, 35, 31, 0.30)' },
  sepia: { line: '#85735a', lineStrong: '#756445', inkMuted: '#54452f', glassStroke: 'rgba(43, 33, 22, 0.30)' },
  dark: { line: '#71867e', lineStrong: '#8a9e96', inkMuted: '#c3cdc8', glassStroke: 'rgba(255, 255, 255, 0.40)' },
};

// CSS box-shadow strings; React Native's `boxShadow` style takes them as-is.
export const shadows: Record<ThemeName, ShadowTokens> = {
  light: {
    glass: '0 8px 32px rgba(19, 35, 31, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    raised: '0 1px 2px rgba(19, 35, 31, 0.08)',
  },
  sepia: {
    glass: '0 8px 32px rgba(43, 33, 22, 0.14), inset 0 1px 0 rgba(255, 250, 238, 0.6)',
    raised: '0 1px 2px rgba(43, 33, 22, 0.08)',
  },
  dark: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    raised: '0 1px 2px rgba(0, 0, 0, 0.4)',
  },
};
