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
    highlightActive: '#efe2c2',
    highlightGold: '#f3e3b5',
    highlightGreen: '#d6e8dc',
    highlightBlue: '#d7e3f0',
    highlightRose: '#f2dada',
    danger: '#a3392b',
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
    highlightActive: '#e2cfa4',
    highlightGold: '#ead39b',
    highlightGreen: '#cfdfc3',
    highlightBlue: '#cdd9dd',
    highlightRose: '#ecd0c4',
    danger: '#963425',
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
    highlightActive: '#3a3420',
    highlightGold: '#3d3519',
    highlightGreen: '#1e3a2e',
    highlightBlue: '#1e2d3f',
    highlightRose: '#3f2427',
    danger: '#f0a493',
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

// CSS box-shadow strings; React Native's `boxShadow` style takes them as-is.
export const shadows: Record<ThemeName, ShadowTokens> = {
  light: {
    glass: '0 8px 32px rgba(19, 35, 31, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    raised: '0 1px 2px rgba(19, 35, 31, 0.06)',
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
