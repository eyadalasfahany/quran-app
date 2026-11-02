// Full 1254×1254 canvases; clip rects overlap vertically (see generate-splash-logo-layers.mjs).

export const SPLASH_LOGO_VIEWBOX = 1254 as const;

export type SplashRasterLayer = {
  id: string;
  source: number;
  /** Clip / reveal band in viewBox coordinates */
  x: number;
  y: number;
  width: number;
  height: number;
  segment: readonly [number, number];
};

export const splashRasterLayers: readonly SplashRasterLayer[] = [
  {
    id: 'minaretLeft',
    source: require('../../../assets/images/splash-layers/minaret-left.png'),
    x: 48,
    y: 52,
    width: 440,
    height: 610,
    segment: [0, 0.32],
  },
  {
    id: 'minaretRight',
    source: require('../../../assets/images/splash-layers/minaret-right.png'),
    x: 766,
    y: 52,
    width: 440,
    height: 610,
    segment: [0.12, 0.38],
  },
  {
    id: 'dome',
    source: require('../../../assets/images/splash-layers/dome.png'),
    x: 0,
    y: 52,
    width: 1254,
    height: 600,
    segment: [0.28, 0.58],
  },
  {
    id: 'arabic',
    source: require('../../../assets/images/splash-layers/arabic.png'),
    x: 0,
    y: 548,
    width: 1254,
    height: 420,
    segment: [0.52, 0.78],
  },
  {
    id: 'english',
    source: require('../../../assets/images/splash-layers/english.png'),
    x: 0,
    y: 868,
    width: 1254,
    height: 340,
    segment: [0.72, 1],
  },
] as const;
