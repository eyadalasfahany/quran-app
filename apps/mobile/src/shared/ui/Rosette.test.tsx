import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Rosette } from './Rosette';
import { resetDrawnOrnamentsForTests } from './useDrawOnView';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const reducedMotion = jest.mocked(useReducedMotion);
// The ornament is hidden from screen readers, so queries have to look past that.
const HIDDEN = { includeHiddenElements: true };
const gold = themes.light.colors.goldOnBrandSurface;
const strokes = [0, 1, 2, 3];

describe('Rosette', () => {
  beforeEach(() => {
    reducedMotion.mockReturnValue(false);
    resetDrawnOrnamentsForTests();
  });

  it('draws the star, the two crossed squares and the ring in the given colour', async () => {
    const view = await renderUi(<Rosette color={gold} size={180} testID="rosette" />);

    expect(flatStyle(view.getByTestId('rosette', HIDDEN).props.style)).toMatchObject({ height: 180, width: 180 });
    for (const index of strokes) {
      expect(view.getByTestId(`rosette-stroke-${index}`, HIDDEN).props).toMatchObject({
        fill: null,
        stroke: svgPaint(gold),
        strokeWidth: 0.8,
      });
    }
    expect(view.getByTestId('rosette-stroke-0', HIDDEN).props.d).toBe('M50 4 L63 37 L96 50 L63 63 L50 96 L37 63 L4 50 L37 37 Z');
  });

  it('starts undrawn until it scrolls into view', async () => {
    const view = await renderUi(<Rosette color={gold} size={180} testID="rosette" />);
    const star = view.getByTestId('rosette-stroke-0', HIDDEN).props;

    expect(star.strokeDashoffset).toBeCloseTo(star.strokeDasharray[0]);
  });

  it('is fully drawn at once with Reduce Motion on', async () => {
    reducedMotion.mockReturnValue(true);
    const view = await renderUi(<Rosette color={gold} size={180} testID="rosette" />);

    for (const index of strokes) {
      expect(view.getByTestId(`rosette-stroke-${index}`, HIDDEN).props.strokeDashoffset ?? 0).toBe(0);
    }
  });

  it('takes a position style', async () => {
    const view = await renderUi(<Rosette color={gold} size={120} style={{ position: 'absolute', top: -40 }} testID="rosette" />);

    expect(flatStyle(view.getByTestId('rosette', HIDDEN).props.style)).toMatchObject({ position: 'absolute', top: -40, width: 120 });
  });

  it.each(locales)('is the same symmetric ornament in %s', async (locale) => {
    const view = await renderUi(<Rosette color={gold} size={180} testID="rosette" />, { locale });

    expect(view.getByTestId('rosette-stroke-3', HIDDEN).props.d).toBe('M62 50 A12 12 0 1 1 38 50 A12 12 0 1 1 62 50 Z');
  });

  it('is hidden from screen readers and never takes touches', async () => {
    const view = await renderUi(<Rosette color={gold} size={180} testID="rosette" />);
    const root = view.getByTestId('rosette', HIDDEN);

    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(root.props.pointerEvents).toBe('none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Rosette.tsx')).toEqual([]);
  });
});
