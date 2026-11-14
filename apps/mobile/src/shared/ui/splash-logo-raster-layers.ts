// Full 1254×1254 canvases cut from the logo (see generate-splash-logo-layers.mjs, ADR 0088). Each fades in over
// the pen-drawn mosque: first the brush mosque itself, then «طيبة», then "taybah".

export const SPLASH_LOGO_VIEWBOX = 1254 as const;

export type SplashRasterLayer = {
  id: string;
  source: number;
  /** Fade-in window on the splash's 0 → 1 progress. */
  segment: readonly [number, number];
  /** How far the layer rises into place while it fades in, in viewBox units. */
  rise: number;
};

export const splashRasterLayers: readonly SplashRasterLayer[] = [
  {
    id: 'mosque',
    source: require('../../../assets/images/splash-layers/mosque.png'),
    segment: [0.56, 0.74],
    rise: 0,
  },
  {
    id: 'arabic',
    source: require('../../../assets/images/splash-layers/arabic.png'),
    segment: [0.62, 0.86],
    rise: 14,
  },
  {
    id: 'english',
    source: require('../../../assets/images/splash-layers/english.png'),
    segment: [0.76, 0.96],
    rise: 10,
  },
] as const;

// The pen lines fade out as the brush mosque fades in over them.
export const SPLASH_PEN_FADE: readonly [number, number] = [0.6, 0.76];
