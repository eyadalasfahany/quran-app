import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { SplashBrandMark } from './SplashBrandMark';
import { splashRasterLayers } from './splash-logo-raster-layers';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const reducedMotion = jest.mocked(useReducedMotion);
const HIDDEN = { includeHiddenElements: true };

describe('SplashBrandMark', () => {
  beforeEach(() => {
    reducedMotion.mockReturnValue(false);
  });

  it('renders raster logo layers from the nabawi mark', async () => {
    const view = await renderUi(<SplashBrandMark />);

    expect(view.getByTestId('splash-brand-mark').props.accessibilityLabel).toBe('طيبة');
    expect(view.getByTestId('taybah-splash-logo', HIDDEN)).toBeTruthy();
    for (const layer of splashRasterLayers) {
      expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN)).toBeTruthy();
    }
  });

  it('is fully shown at once with Reduce Motion on', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await renderUi(<SplashBrandMark />);

    expect(view.getByTestId('splash-logo-arabic', HIDDEN)).toBeTruthy();
    expect(view.getByTestId('splash-logo-english', HIDDEN)).toBeTruthy();
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<SplashBrandMark />, { locale });

    expect(view.getByTestId('splash-brand-mark')).toBeTruthy();
  });

  it('has no raw colour literals in splash logo components', () => {
    expect(rawColorLiterals('SplashBrandMark.tsx')).toEqual([]);
    expect(rawColorLiterals('TaybahSplashLogo.tsx')).toEqual([]);
    expect(rawColorLiterals('SplashLogoRasterLayer.tsx')).toEqual([]);
  });
});
