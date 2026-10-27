import { fireEvent } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SurahCartouche } from './SurahCartouche';
import { resetDrawnOrnamentsForTests } from './useDrawOnView';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const reducedMotion = jest.mocked(useReducedMotion);
// The ornament is hidden from screen readers, so queries have to look past that.
const HIDDEN = { includeHiddenElements: true };
// Two frames, then each end's star: two squares and a ring.
const STROKES = 8;

async function laidOut(options: Parameters<typeof renderUi>[1] = {}) {
  const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />, options);
  await fireEvent(view.getByTestId('banner'), 'layout', { nativeEvent: { layout: { height: 52, width: 300, x: 0, y: 0 } } });
  return view;
}

describe('SurahCartouche', () => {
  beforeEach(() => {
    reducedMotion.mockReturnValue(false);
    resetDrawnOrnamentsForTests();
  });

  it('renders the name as a header in Amiri Bold', async () => {
    const view = await renderUi(<SurahCartouche name="سورة الفاتحة" />);
    const name = flatStyle(view.getByText('سورة الفاتحة').props.style);

    expect(view.getByRole('header', { name: 'سورة الفاتحة' })).toBeOnTheScreen();
    expect(name).toMatchObject({ color: themes.light.colors.ink, fontFamily: 'Amiri-Bold' });
    expect(name.fontWeight).toBeUndefined();
  });

  it('draws the frame only once it knows its size', async () => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />);

    expect(view.queryByTestId('banner-frame', HIDDEN)).toBeNull();
  });

  it('draws the design’s pointed double frame at the band’s width', async () => {
    const view = await laidOut();
    const { stroke } = themes.light;

    expect(view.getByTestId('banner-stroke-0', HIDDEN).props).toMatchObject({
      d: 'M20 4 L280 4 L296 26 L280 48 L20 48 L4 26 Z',
      strokeWidth: stroke.hairline,
    });
    expect(view.getByTestId('banner-stroke-1', HIDDEN).props).toMatchObject({
      d: 'M28 9 L272 9 L284 26 L272 43 L28 43 L16 26 Z',
      strokeWidth: stroke.frameInner,
    });
  });

  it('sets an eight-pointed star with a ring inside each pointed end', async () => {
    const view = await laidOut();

    expect(view.getByTestId('banner-stroke-4', HIDDEN).props.d).toBe('M47.5 26 A3.5 3.5 0 1 1 40.5 26 A3.5 3.5 0 1 1 47.5 26 Z');
    expect(view.getByTestId('banner-stroke-7', HIDDEN).props.d).toBe('M259.5 26 A3.5 3.5 0 1 1 252.5 26 A3.5 3.5 0 1 1 259.5 26 Z');
    expect(view.getByTestId('banner-stroke-2', HIDDEN).props.d).toBe('M51.07 33.07 L36.93 33.07 L36.93 18.93 L51.07 18.93 Z');
    expect(view.getByTestId('banner-stroke-3', HIDDEN).props.d).toBe('M44 36 L34 26 L44 16 L54 26 Z');
  });

  it.each(['light', 'sepia', 'dark'] as const)('strokes every line in gold in %s', async (theme) => {
    const view = await laidOut({ theme });

    for (let index = 0; index < STROKES; index += 1) {
      expect(view.getByTestId(`banner-stroke-${index}`, HIDDEN).props).toMatchObject({
        fill: null,
        stroke: svgPaint(themes[theme].colors.gold),
      });
    }
  });

  it('keeps the name clear of the stars', async () => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />);

    expect(flatStyle(view.getByTestId('banner').props.style)).toMatchObject({ minHeight: 52, paddingHorizontal: 66 });
  });

  it('starts undrawn, and fully drawn with Reduce Motion on', async () => {
    const moving = await laidOut();
    const outer = moving.getByTestId('banner-stroke-0', HIDDEN).props;
    expect(outer.strokeDashoffset).toBeCloseTo(outer.strokeDasharray[0]);

    reducedMotion.mockReturnValue(true);
    const still = await laidOut();
    expect(still.getByTestId('banner-stroke-0', HIDDEN).props.strokeDashoffset ?? 0).toBe(0);
  });

  it('hides the frame from screen readers', async () => {
    const view = await laidOut();
    const frame = view.getByTestId('banner-frame', HIDDEN);

    expect(frame.props.accessibilityElementsHidden).toBe(true);
    expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(view.getByRole('header', { name: 'سورة البقرة' })).toBeOnTheScreen();
  });

  it.each(locales)('centres the name right to left in %s', async (locale) => {
    const view = await renderUi(<SurahCartouche name="سورة الفاتحة" />, { locale });

    expect(flatStyle(view.getByText('سورة الفاتحة').props.style)).toMatchObject({
      textAlign: 'center',
      writingDirection: 'rtl',
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SurahCartouche.tsx')).toEqual([]);
  });
});
