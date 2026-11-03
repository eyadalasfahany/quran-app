import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { splashRasterLayers } from './splash-logo-raster-layers';
import { TaybahSplashLogo } from './TaybahSplashLogo';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

const reducedMotion = jest.mocked(useReducedMotion);
const HIDDEN = { includeHiddenElements: true } as const;

describe('TaybahSplashLogo', () => {
  beforeEach(() => {
    reducedMotion.mockReturnValue(false);
  });

  it('draws a square logo at the splash size, with one band per raster layer', async () => {
    const view = await renderUi(<TaybahSplashLogo />);
    const style = StyleSheet.flatten(view.getByTestId('taybah-splash-logo', HIDDEN).props.style);

    expect(style).toMatchObject({ height: 280, width: 280 });
    for (const layer of splashRasterLayers) {
      expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN)).toBeTruthy();
    }
  });

  it('is hidden from accessibility, because its parent carries the label', async () => {
    const view = await renderUi(<TaybahSplashLogo />);
    const logo = view.getByTestId('taybah-splash-logo', HIDDEN);

    expect(logo.props.accessibilityElementsHidden).toBe(true);
    expect(logo.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('does not report the draw as complete while the draw is still running', async () => {
    const onDrawComplete = jest.fn();
    await renderUi(<TaybahSplashLogo onDrawComplete={onDrawComplete} />);

    expect(onDrawComplete).not.toHaveBeenCalled();
  });

  it('reports the draw complete at once with Reduce Motion on', async () => {
    reducedMotion.mockReturnValue(true);
    const onDrawComplete = jest.fn();
    await renderUi(<TaybahSplashLogo onDrawComplete={onDrawComplete} />);

    expect(onDrawComplete).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('renders in %s', async (locale) => {
    const view = await renderUi(<TaybahSplashLogo />, { locale });

    expect(view.getByTestId('taybah-splash-logo', HIDDEN)).toBeTruthy();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('TaybahSplashLogo.tsx')).toEqual([]);
  });
});
