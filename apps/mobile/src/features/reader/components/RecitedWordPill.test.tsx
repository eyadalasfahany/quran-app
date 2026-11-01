import { I18nManager } from 'react-native';
import { act } from '@testing-library/react-native';
import { setUpTests, useReducedMotion } from 'react-native-reanimated';

import { ThemeProvider, themes } from '@/core/theme';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { RecitedWordPill } from './RecitedWordPill';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof import('react-native-reanimated')>('react-native-reanimated');
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

setUpTests();

const colors = themes.light.colors;
const CONTAINER = 300;
const first = { height: 30, width: 58, x: 40, y: 12 };
const next = { height: 30, width: 70, x: 120, y: 12 };

/** The pill is hidden from accessibility, so RNTL needs the hidden elements included to find it. */
function pillNode(view: Awaited<ReturnType<typeof renderUi>>) {
  return view.getByTestId('pill', { includeHiddenElements: true });
}

function pill(props: Partial<Parameters<typeof RecitedWordPill>[0]> = {}) {
  return (
    <RecitedWordPill containerWidth={CONTAINER} move="jump" rect={first} testID="pill" {...props} />
  );
}

describe('RecitedWordPill', () => {
  afterEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
    jest.useRealTimers();
  });

  it('renders nothing when there is no rect', async () => {
    const view = await renderUi(pill({ rect: null }));
    expect(view.queryByTestId('pill', { includeHiddenElements: true })).toBeNull();
  });

  it('is a brand-surface pill with the small radius', async () => {
    const view = await renderUi(pill());
    expect(flatStyle(pillNode(view).props.style)).toMatchObject({
      backgroundColor: colors.brandSurface,
      borderRadius: themes.light.radius.sm,
      position: 'absolute',
    });
  });

  it('is hidden from accessibility and takes no touches', async () => {
    const view = await renderUi(pill());
    const node = pillNode(view);
    expect(node.props.accessibilityElementsHidden).toBe(true);
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(node.props.pointerEvents).toBe('none');
  });

  it('jumps straight to the rect (LTR)', async () => {
    const view = await renderUi(pill(), { locale: 'en' });
    expect(pillNode(view)).toHaveAnimatedStyle({
      height: 30,
      transform: [{ translateX: 40 }, { translateY: 12 }],
      width: 58,
    });
  });

  it('slides to the next word on the same line and reaches it after the timing (LTR)', async () => {
    jest.useFakeTimers();
    const view = await renderUi(pill(), { locale: 'en' });
    await act(async () => {
      view.rerender(
        <ThemeProvider name="light">{pill({ move: 'slide', rect: next })}</ThemeProvider>,
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(pillNode(view)).toHaveAnimatedStyle({
      transform: [{ translateX: 120 }, { translateY: 12 }],
      width: 70,
    });
  });

  it('jumps instead of sliding when Reduce Motion is on', async () => {
    jest.useFakeTimers();
    jest.mocked(useReducedMotion).mockReturnValue(true);
    const view = await renderUi(pill(), { locale: 'en' });
    await act(async () => {
      view.rerender(<ThemeProvider name="light">{pill({ move: 'slide', rect: next })}</ThemeProvider>);
    });
    // One frame only: a slide (150 ms) would still be near the start, a jump is already at the target.
    await act(async () => {
      jest.advanceTimersByTime(16);
    });
    expect(pillNode(view)).toHaveAnimatedStyle({
      transform: [{ translateX: 120 }, { translateY: 12 }],
      width: 70,
    });
  });

  it.each(locales)('places the x from the start edge in %s', async (locale) => {
    const view = await renderUi(pill(), { locale });
    const expected = I18nManager.isRTL ? first.x - (CONTAINER - first.width) : first.x;
    expect(pillNode(view)).toHaveAnimatedStyle({ transform: [{ translateX: expected }, { translateY: first.y }] });
  });

  it('measures from the right edge in an RTL layout', async () => {
    const view = await renderUi(pill(), { locale: 'ar' });
    expect(pillNode(view)).toHaveAnimatedStyle({
      transform: [{ translateX: first.x - (CONTAINER - first.width) }, { translateY: first.y }],
    });
  });

  it('measures from the left edge in an LTR layout', async () => {
    const view = await renderUi(pill(), { locale: 'en' });
    expect(pillNode(view)).toHaveAnimatedStyle({ transform: [{ translateX: first.x }, { translateY: first.y }] });
  });

  it('calls onArrive straight after a jump', async () => {
    const onArrive = jest.fn();
    await renderUi(pill({ onArrive }));
    expect(onArrive).toHaveBeenCalledTimes(1);
  });

  it('calls onArrive when a slide finishes', async () => {
    jest.useFakeTimers();
    const onArrive = jest.fn();
    const view = await renderUi(pill({ onArrive }));
    expect(onArrive).toHaveBeenCalledTimes(1);

    await act(async () => {
      view.rerender(
        <ThemeProvider name="light">{pill({ move: 'slide', onArrive, rect: next })}</ThemeProvider>,
      );
    });
    expect(onArrive).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(onArrive).toHaveBeenCalledTimes(2);
  });
});
