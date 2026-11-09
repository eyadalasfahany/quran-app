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
  /** Segmented-control and stepper track (screens/, Reader settings). */
  fillTrack: string;
  /** Selected segment in a segmented control; lighter than the track in dark. */
  segmentSelected: string;
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
  /** Salah hero green veils (screens/, #Salah); same in every theme. */
  salahHeroVeil: string;
  salahHeroVeilLower: string;
  /** Prayer-time row photo scrims over surfaceRaised (screens/, #Salah). */
  salahRowScrimBase: string;
  salahRowScrimTop: string;
  salahRowScrimLastBase: string;
  salahRowScrimLastTop: string;
  salahRowScrimActiveBase: string;
  salahRowScrimActiveTop: string;
  salahRowScrimActiveTint: string;
  salahRowScrimPastBase: string;
  salahRowScrimPastTop: string;
  playerBg: string;
  playerInk: string;
  playerMuted: string;
  playerAccent: string;
  /** The options bar's glass on player-bg (screens/, #Player). */
  playerGlassFill: string;
  playerGlassStroke: string;
  /** The Qibla instrument (screens/, #Qibla). Same in every theme, like player*. */
  qiblaGlowBrand: string;
  qiblaTickMinor: string;
  qiblaTickMajor: string;
  qiblaGoldSoft: string;
  qiblaGoldStroke: string;
  qiblaGoldHalo: string;
  qiblaAlignedHalo: string;
  qiblaBezelFrom: string;
  qiblaBezelTo: string;
  qiblaHubFrom: string;
  qiblaHubTo: string;
  qiblaHubRing: string;
  qiblaDartFrom: string;
  qiblaDartGlow: string;
  qiblaCounterweight: string;
  /** Hadith collection covers (screens/frames/hadith, HadithCollCovers*). Same in every theme. */
  coverGreen: string;
  coverMaroon: string;
  coverNavy: string;
  coverBrown: string;
  coverNeutral: string;
  coverTitle: string;
  coverOrnament: string;
  coverFrameLine: string;
  coverSpine: string;
  coverSpineEdge: string;
  coverPageEdge: string;
  coverShadow: string;
  coverShadowSoft: string;
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
    segmentSelected: '#fffdf8',
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
    salahHeroVeil: 'rgba(31, 77, 64, 0.56)',
    salahHeroVeilLower: 'rgba(19, 44, 37, 0.55)',
    salahRowScrimBase: 'rgba(255, 253, 248, 0.561)',
    salahRowScrimTop: 'rgba(255, 253, 248, 0.412)',
    salahRowScrimLastBase: 'rgba(255, 253, 248, 0.541)',
    salahRowScrimLastTop: 'rgba(255, 253, 248, 0.392)',
    salahRowScrimActiveBase: 'rgba(255, 253, 248, 0.459)',
    salahRowScrimActiveTop: 'rgba(255, 253, 248, 0.302)',
    salahRowScrimActiveTint: 'rgba(31, 77, 64, 0.051)',
    salahRowScrimPastBase: 'rgba(255, 253, 248, 0.78)',
    salahRowScrimPastTop: 'rgba(255, 253, 248, 0.62)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
    playerGlassFill: 'rgba(255, 255, 255, 0.07)',
    playerGlassStroke: 'rgba(255, 255, 255, 0.14)',
    qiblaGlowBrand: 'rgba(31, 77, 64, 0.5)',
    qiblaTickMinor: 'rgba(243, 238, 226, 0.16)',
    qiblaTickMajor: 'rgba(243, 238, 226, 0.45)',
    qiblaGoldSoft: 'rgba(201, 169, 97, 0.12)',
    qiblaGoldStroke: 'rgba(201, 169, 97, 0.4)',
    qiblaGoldHalo: 'rgba(201, 169, 97, 0.35)',
    qiblaAlignedHalo: 'rgba(201, 169, 97, 0.13)',
    qiblaBezelFrom: '#13201c',
    qiblaBezelTo: '#0b1411',
    qiblaHubFrom: '#182b26',
    qiblaHubTo: '#0a1310',
    qiblaHubRing: 'rgba(243, 238, 226, 0.25)',
    qiblaDartFrom: '#a07c33',
    qiblaDartGlow: 'rgba(230, 199, 126, 0.55)',
    qiblaCounterweight: 'rgba(243, 238, 226, 0.22)',
    coverGreen: '#1f4d40',
    coverMaroon: '#6b2a34',
    coverNavy: '#243b5e',
    coverBrown: '#5c4130',
    coverNeutral: '#4a5a55',
    coverTitle: '#f7f3ea',
    coverOrnament: '#c9a961',
    coverFrameLine: 'rgba(201, 169, 97, 0.7)',
    coverSpine: 'rgba(0, 0, 0, 0.28)',
    coverSpineEdge: 'rgba(201, 169, 97, 0.45)',
    coverPageEdge: '#efe6d2',
    coverShadow: 'rgba(19, 35, 31, 0.28)',
    coverShadowSoft: 'rgba(19, 35, 31, 0.14)',
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
    segmentSelected: '#f8efdc',
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
    salahHeroVeil: 'rgba(31, 77, 64, 0.56)',
    salahHeroVeilLower: 'rgba(19, 44, 37, 0.55)',
    salahRowScrimBase: 'rgba(248, 239, 220, 0.561)',
    salahRowScrimTop: 'rgba(248, 239, 220, 0.412)',
    salahRowScrimLastBase: 'rgba(248, 239, 220, 0.541)',
    salahRowScrimLastTop: 'rgba(248, 239, 220, 0.392)',
    salahRowScrimActiveBase: 'rgba(248, 239, 220, 0.459)',
    salahRowScrimActiveTop: 'rgba(248, 239, 220, 0.302)',
    salahRowScrimActiveTint: 'rgba(31, 77, 64, 0.051)',
    salahRowScrimPastBase: 'rgba(248, 239, 220, 0.78)',
    salahRowScrimPastTop: 'rgba(248, 239, 220, 0.62)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
    playerGlassFill: 'rgba(255, 255, 255, 0.07)',
    playerGlassStroke: 'rgba(255, 255, 255, 0.14)',
    qiblaGlowBrand: 'rgba(31, 77, 64, 0.5)',
    qiblaTickMinor: 'rgba(243, 238, 226, 0.16)',
    qiblaTickMajor: 'rgba(243, 238, 226, 0.45)',
    qiblaGoldSoft: 'rgba(201, 169, 97, 0.12)',
    qiblaGoldStroke: 'rgba(201, 169, 97, 0.4)',
    qiblaGoldHalo: 'rgba(201, 169, 97, 0.35)',
    qiblaAlignedHalo: 'rgba(201, 169, 97, 0.13)',
    qiblaBezelFrom: '#13201c',
    qiblaBezelTo: '#0b1411',
    qiblaHubFrom: '#182b26',
    qiblaHubTo: '#0a1310',
    qiblaHubRing: 'rgba(243, 238, 226, 0.25)',
    qiblaDartFrom: '#a07c33',
    qiblaDartGlow: 'rgba(230, 199, 126, 0.55)',
    qiblaCounterweight: 'rgba(243, 238, 226, 0.22)',
    coverGreen: '#1f4d40',
    coverMaroon: '#6b2a34',
    coverNavy: '#243b5e',
    coverBrown: '#5c4130',
    coverNeutral: '#4a5a55',
    coverTitle: '#f7f3ea',
    coverOrnament: '#c9a961',
    coverFrameLine: 'rgba(201, 169, 97, 0.7)',
    coverSpine: 'rgba(0, 0, 0, 0.28)',
    coverSpineEdge: 'rgba(201, 169, 97, 0.45)',
    coverPageEdge: '#efe6d2',
    coverShadow: 'rgba(19, 35, 31, 0.28)',
    coverShadowSoft: 'rgba(19, 35, 31, 0.14)',
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
    segmentSelected: '#24342f',
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
    salahHeroVeil: 'rgba(31, 77, 64, 0.56)',
    salahHeroVeilLower: 'rgba(19, 44, 37, 0.55)',
    salahRowScrimBase: 'rgba(23, 36, 33, 0.439)',
    salahRowScrimTop: 'rgba(23, 36, 33, 0.290)',
    salahRowScrimLastBase: 'rgba(23, 36, 33, 0.400)',
    salahRowScrimLastTop: 'rgba(23, 36, 33, 0.271)',
    salahRowScrimActiveBase: 'rgba(23, 36, 33, 0.361)',
    salahRowScrimActiveTop: 'rgba(23, 36, 33, 0.251)',
    salahRowScrimActiveTint: 'rgba(140, 197, 175, 0.071)',
    salahRowScrimPastBase: 'rgba(23, 36, 33, 0.82)',
    salahRowScrimPastTop: 'rgba(23, 36, 33, 0.65)',
    playerBg: '#0e1b18',
    playerInk: '#f3eee2',
    playerMuted: '#a7b3ad',
    playerAccent: '#e6c77e',
    playerGlassFill: 'rgba(255, 255, 255, 0.07)',
    playerGlassStroke: 'rgba(255, 255, 255, 0.14)',
    qiblaGlowBrand: 'rgba(31, 77, 64, 0.5)',
    qiblaTickMinor: 'rgba(243, 238, 226, 0.16)',
    qiblaTickMajor: 'rgba(243, 238, 226, 0.45)',
    qiblaGoldSoft: 'rgba(201, 169, 97, 0.12)',
    qiblaGoldStroke: 'rgba(201, 169, 97, 0.4)',
    qiblaGoldHalo: 'rgba(201, 169, 97, 0.35)',
    qiblaAlignedHalo: 'rgba(201, 169, 97, 0.13)',
    qiblaBezelFrom: '#13201c',
    qiblaBezelTo: '#0b1411',
    qiblaHubFrom: '#182b26',
    qiblaHubTo: '#0a1310',
    qiblaHubRing: 'rgba(243, 238, 226, 0.25)',
    qiblaDartFrom: '#a07c33',
    qiblaDartGlow: 'rgba(230, 199, 126, 0.55)',
    qiblaCounterweight: 'rgba(243, 238, 226, 0.22)',
    coverGreen: '#1f4d40',
    coverMaroon: '#6b2a34',
    coverNavy: '#243b5e',
    coverBrown: '#5c4130',
    coverNeutral: '#4a5a55',
    coverTitle: '#f7f3ea',
    coverOrnament: '#c9a961',
    coverFrameLine: 'rgba(201, 169, 97, 0.7)',
    coverSpine: 'rgba(0, 0, 0, 0.28)',
    coverSpineEdge: 'rgba(201, 169, 97, 0.45)',
    coverPageEdge: '#efe6d2',
    coverShadow: 'rgba(19, 35, 31, 0.28)',
    coverShadowSoft: 'rgba(19, 35, 31, 0.14)',
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

// Cream launch backdrop shown behind the native splash and the animated overlay. Not a theme colour: it stays cream
// in every theme, and app.config.ts repeats the same value for expo-splash-screen.
export const launchBackground = '#F9F7F2';
