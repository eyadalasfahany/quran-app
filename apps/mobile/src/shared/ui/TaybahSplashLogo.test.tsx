import { StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { splashRasterLayers } from './splash-logo-raster-layers';
import { splashMosqueStrokes } from './splash-mosque-strokes';
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

  it('draws a square logo at the splash size: a pen line per mosque stroke, then each fade-in layer', async () => {
    const view = await renderUi(<TaybahSplashLogo />);
    const style = StyleSheet.flatten(view.getByTestId('taybah-splash-logo', HIDDEN).props.style);

    expect(style).toMatchObject({ height: 280, width: 280 });
    expect(splashMosqueStrokes.length).toBeGreaterThan(0);
    for (const stroke of splashMosqueStrokes) {
      expect(view.getByTestId(`splash-stroke-${stroke.id}`, HIDDEN)).toBeTruthy();
    }
    for (const layer of splashRasterLayers) {
      expect(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN)).toBeTruthy();
    }
  });

  it('starts with the pen lines visible and every fade-in layer hidden', async () => {
    const view = await renderUi(<TaybahSplashLogo />);

    expect(StyleSheet.flatten(view.getByTestId('splash-mosque-pen', HIDDEN).props.style).opacity).toBe(1);
    for (const layer of splashRasterLayers) {
      expect(StyleSheet.flatten(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style).opacity).toBe(0);
    }
  });

  it('shows the finished logo at once with Reduce Motion on: brush mosque and words in, pen lines gone', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await renderUi(<TaybahSplashLogo />);

    expect(StyleSheet.flatten(view.getByTestId('splash-mosque-pen', HIDDEN).props.style).opacity).toBe(0);
    for (const layer of splashRasterLayers) {
      expect(StyleSheet.flatten(view.getByTestId(`splash-logo-${layer.id}`, HIDDEN).props.style).opacity).toBe(1);
    }
  });

  it('draws the mosque before the lettering, and the Arabic before the Latin', () => {
    const lastStrokeEnd = Math.max(...splashMosqueStrokes.map((stroke) => stroke.segment[1]));
    const start = (id: string) => splashRasterLayers.find((layer) => layer.id === id)?.segment[0] ?? -1;

    expect(start('arabic')).toBeGreaterThanOrEqual(lastStrokeEnd);
    expect(start('english')).toBeGreaterThan(start('arabic'));
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
