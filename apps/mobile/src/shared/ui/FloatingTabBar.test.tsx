import { act, within } from '@testing-library/react-native';
import { Text } from 'react-native';
import { setUpTests } from 'react-native-reanimated';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { LANDSCAPE_PHONE, resetWindowSize, setWindowSize } from '../../../jest/window-size';
import { rawColorLiterals } from '../../../jest/ui-source';
import { useTabBarScrollStore } from '@/core/layout/tab-bar-scroll-store';
import { themes } from '@/core/theme';

import { FloatingTabBar } from './FloatingTabBar';

setUpTests();

let mockBottomInset = 0;
let mockSideInsets = { left: 0, right: 0 };

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: mockBottomInset, left: mockSideInsets.left, right: mockSideInsets.right, top: 0 }),
  };
});

// The solid fallback is the Android surface; Liquid Glass is never available there.
jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => false,
}));

const labels = {
  ar: 'التنقل الرئيسي',
  en: 'Main navigation',
} as const;

function bar(hidden = false) {
  return (
    <FloatingTabBar hidden={hidden} label={labels.ar}>
      <Text>first</Text>
      <Text>second</Text>
    </FloatingTabBar>
  );
}

describe('FloatingTabBar', () => {
  beforeEach(() => {
    mockBottomInset = 0;
    mockSideInsets = { left: 0, right: 0 };
  });

  it('insets the capsule from the leading and trailing edges in LTR', async () => {
    mockSideInsets = { left: 44, right: 12 };
    const view = await renderUi(bar(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style)).toMatchObject({ end: 16 + 12, start: 16 + 44 });
  });

  it('mirrors the side insets in RTL, so the notch side is the trailing one', async () => {
    mockSideInsets = { left: 44, right: 12 };
    const view = await renderUi(bar(), { locale: 'ar' });

    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style)).toMatchObject({ end: 16 + 44, start: 16 + 12 });
  });

  it('renders a tablist with its label and the items', async () => {
    const view = await renderUi(bar());

    const list = view.getByTestId('floating-tab-bar');
    expect(list.props.accessibilityRole).toBe('tablist');
    expect(list.props.accessibilityLabel).toBe(labels.ar);
    expect(within(list).getByText('first')).toBeOnTheScreen();
    expect(within(list).getByText('second')).toBeOnTheScreen();
  });

  it.each(locales)('labels the tablist in %s', async (locale) => {
    const view = await renderUi(
      <FloatingTabBar label={labels[locale]}>
        <Text>item</Text>
      </FloatingTabBar>,
      { locale },
    );

    expect(view.getByTestId('floating-tab-bar').props.accessibilityLabel).toBe(labels[locale]);
  });

  it('draws the 64 pt capsule with 6 padding, a 32 radius and the solid glassFallback with a hairline (ADR 0033 §2)', async () => {
    const view = await renderUi(bar());
    const capsule = flatStyle(view.getByTestId('floating-tab-bar').props.style);
    const { colors, shadows } = themes.light;

    expect(capsule).toMatchObject({
      backgroundColor: colors.glassFallback,
      borderColor: colors.line,
      borderRadius: 32,
      boxShadow: shadows.glass,
      flexDirection: 'row',
      height: 64,
    });
  });

  it('lays the items out in a row, so RTL mirrors their order', async () => {
    const view = await renderUi(bar());

    expect(flatStyle(view.getByTestId('floating-tab-bar').props.style)).toMatchObject({ flexDirection: 'row' });
  });

  it('sits 16 from each side and 12 above the system navigation inset', async () => {
    mockBottomInset = 20;
    const view = await renderUi(bar());
    const dock = view.getByTestId('floating-tab-bar-dock');

    expect(flatStyle(dock.props.style)).toMatchObject({
      bottom: 32,
      end: 16,
      position: 'absolute',
      start: 16,
    });
  });

  it('places the bar 12 above the edge when there is no system inset', async () => {
    const view = await renderUi(bar());
    const dock = view.getByTestId('floating-tab-bar-dock');

    expect(flatStyle(dock.props.style).bottom).toBe(12);
  });

  it('draws nothing on expanded windows, where the sidebar takes over', async () => {
    const view = await renderUi(bar(true));

    expect(view.queryByTestId('floating-tab-bar')).toBeNull();
    expect(view.queryByText('first')).toBeNull();
  });

  describe('while scrolling has hidden the tabs', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(async () => {
      jest.useRealTimers();
      await act(async () => {
        useTabBarScrollStore.setState({ collapsed: false, lastY: 0, tracking: false });
      });
    });

    it('slides the capsule off the bottom edge by its height, 12 offset, 16 and the inset, with no fade', async () => {
      const view = await renderUi(bar());

      await act(async () => {
        useTabBarScrollStore.setState({ collapsed: true, tracking: true });
      });
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      const dock = view.getByTestId('floating-tab-bar-dock');
      expect(dock).toHaveAnimatedStyle({ transform: [{ translateY: 64 + 12 + 16 }] });
      expect(flatStyle(dock.props.style).opacity).toBeUndefined();
    });
  });

  it('does not block touches outside the capsule', async () => {
    const view = await renderUi(bar());

    expect(view.getByTestId('floating-tab-bar-dock').props.pointerEvents).toBe('box-none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('FloatingTabBar.tsx')).toEqual([]);
  });
});

describe('FloatingTabBar as a vertical rail in a short window (ADR 0036)', () => {
  beforeEach(() => {
    mockBottomInset = 0;
    mockSideInsets = { left: 0, right: 0 };
  });

  afterEach(() => {
    resetWindowSize();
  });

  it('draws the rail on the start edge, 12 past the start safe area, and vertically centred', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    mockSideInsets = { left: 44, right: 12 };
    const view = await renderUi(bar(), { locale: 'en' });

    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style)).toMatchObject({
      justifyContent: 'center',
      start: 12 + 44,
      top: 0,
      bottom: 0,
    });
    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style).end).toBeUndefined();
  });

  it('mirrors the rail to the right edge in Arabic, where the start edge is the right one', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    mockSideInsets = { left: 44, right: 12 };
    const view = await renderUi(bar(), { locale: 'ar' });

    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style)).toMatchObject({ start: 12 + 12 });
  });

  it('stacks the items in a column of 76 by 324, the rail size', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(bar());

    expect(flatStyle(view.getByTestId('floating-tab-bar').props.style)).toMatchObject({
      flexDirection: 'column',
      height: 324,
      width: 76,
    });
  });

  it('shortens the rail to fit a window under 348 high, keeping 12 clear above and below', async () => {
    setWindowSize(844, 300);
    const view = await renderUi(bar());

    expect(flatStyle(view.getByTestId('floating-tab-bar').props.style).height).toBe(276);
  });

  it('keeps the tablist role, its label and every item in the rail', async () => {
    setWindowSize(LANDSCAPE_PHONE.width, LANDSCAPE_PHONE.height);
    const view = await renderUi(bar(), { locale: 'en' });

    const list = view.getByTestId('floating-tab-bar');
    expect(list.props.accessibilityRole).toBe('tablist');
    expect(list.props.accessibilityLabel).toBe(labels.ar);
    expect(within(list).getByText('first')).toBeOnTheScreen();
    expect(within(list).getByText('second')).toBeOnTheScreen();
  });

  it('keeps the tall-window bar as a row at the bottom', async () => {
    setWindowSize(390, 844);
    const view = await renderUi(bar());

    expect(flatStyle(view.getByTestId('floating-tab-bar').props.style)).toMatchObject({ flexDirection: 'row', height: 64 });
    expect(flatStyle(view.getByTestId('floating-tab-bar-dock').props.style).bottom).toBe(12);
  });
});
