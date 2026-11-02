import { fireEvent, within } from '@testing-library/react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { flatStyle, locales, renderUi, svgPaint } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SurahCartouche, type CartoucheVariant } from './SurahCartouche';
import { resetDrawnOrnamentsForTests } from './useDrawOnView';

jest.mock('react-native-reanimated', () => ({
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: jest.fn(() => false),
}));

const reducedMotion = jest.mocked(useReducedMotion);
// The ornament is hidden from screen readers, so queries have to look past that.
const HIDDEN = { includeHiddenElements: true };
// Compact: the outer and inner rules. Full: those, then the petals, the details and the leaves.
const STROKES: Record<CartoucheVariant, number> = { compact: 2, full: 5 };
const HEIGHT: Record<CartoucheVariant, number> = { compact: 52, full: 112 };

async function laidOut(variant: CartoucheVariant = 'compact', options: Parameters<typeof renderUi>[1] = {}) {
  const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" variant={variant} />, options);
  await fireEvent(view.getByTestId('banner'), 'layout', {
    nativeEvent: { layout: { height: HEIGHT[variant], width: 300, x: 0, y: 0 } },
  });
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

  it('is compact by default: the band alone, 52 high', async () => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />);
    await fireEvent(view.getByTestId('banner'), 'layout', { nativeEvent: { layout: { height: 52, width: 300, x: 0, y: 0 } } });

    expect(view.getAllByTestId(/^banner-stroke-/, HIDDEN)).toHaveLength(STROKES.compact);
    expect(flatStyle(view.getByTestId('banner').props.style)).toMatchObject({ minHeight: 52 });
  });

  it('draws the compact band at the band’s width, between its rules', async () => {
    const view = await laidOut('compact');
    const { stroke } = themes.light;

    expect(view.getByTestId('banner-stroke-0', HIDDEN).props).toMatchObject({
      d: expect.stringMatching(/^M40\.74 2\.75 L259\.26 2\.75 /),
      strokeWidth: stroke.frame,
    });
    expect(view.getByTestId('banner-stroke-1', HIDDEN).props).toMatchObject({
      strokeWidth: stroke.frameRule,
    });
    expect(view.queryByTestId('banner-stroke-2', HIDDEN)).toBeNull();
  });

  it('has the band ends symmetric about the middle', async () => {
    const view = await laidOut('compact');
    const { d } = view.getByTestId('banner-stroke-0', HIDDEN).props;

    // The tip sits 2 in from each edge, on the middle line (26 for the compact band).
    expect(d).toContain('298 26');
    expect(d).toContain('2 26');
  });

  it('draws the full header at 112 high: the band and a rosette clipped above and below it', async () => {
    const view = await laidOut('full');
    const { stroke } = themes.light;

    expect(view.getAllByTestId(/^banner-stroke-/, HIDDEN)).toHaveLength(STROKES.full);
    expect(flatStyle(view.getByTestId('banner').props.style)).toMatchObject({ minHeight: 112 });
    expect(view.getByTestId('banner-stroke-0', HIDDEN).props).toMatchObject({ strokeWidth: stroke.frame });
    expect(view.getByTestId('banner-stroke-2', HIDDEN).props).toMatchObject({ strokeWidth: stroke.rosettePetal });
    expect(view.getByTestId('banner-stroke-3', HIDDEN).props).toMatchObject({ strokeWidth: stroke.rosetteDetail });
    expect(view.getByTestId('banner-stroke-4', HIDDEN).props).toMatchObject({ strokeWidth: stroke.frameRule });
  });

  it('clips the rosette with two rects above and below the band', async () => {
    const view = await laidOut('full');
    const top = view.getByTestId('banner-clip-0', HIDDEN);
    const bottom = view.getByTestId('banner-clip-1', HIDDEN);

    expect(top.props).toMatchObject({ height: 29, width: 300, x: 0, y: 0 });
    expect(bottom.props).toMatchObject({ height: 29, width: 300, x: 0, y: 83 });
  });

  it('puts the rosette strokes inside the clipped group and leaves the band outside it', async () => {
    const view = await laidOut('full');
    const group = within(view.getByTestId('banner-rosette', HIDDEN));

    expect(group.getByTestId('banner-stroke-2', HIDDEN)).toBeOnTheScreen();
    expect(group.getByTestId('banner-stroke-3', HIDDEN)).toBeOnTheScreen();
    expect(group.getByTestId('banner-stroke-4', HIDDEN)).toBeOnTheScreen();
    expect(group.queryByTestId('banner-stroke-0', HIDDEN)).toBeNull();
  });

  it.each(['light', 'sepia', 'dark'] as const)('strokes every line in gold in %s, both variants', async (theme) => {
    for (const variant of ['compact', 'full'] as const) {
      const view = await laidOut(variant, { theme });

      for (let index = 0; index < STROKES[variant]; index += 1) {
        expect(view.getByTestId(`banner-stroke-${index}`, HIDDEN).props).toMatchObject({
          fill: null,
          stroke: svgPaint(themes[theme].colors.gold),
        });
      }
    }
  });

  it('keeps the name clear of the ends', async () => {
    const view = await renderUi(<SurahCartouche name="سورة البقرة" testID="banner" />);

    expect(flatStyle(view.getByTestId('banner').props.style)).toMatchObject({ minHeight: 52, paddingHorizontal: 58 });
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
    const view = await laidOut('full');
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
