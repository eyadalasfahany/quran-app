import { within } from '@testing-library/react-native';
import { Text } from 'react-native';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { FloatingTabBar } from './FloatingTabBar';

let mockBottomInset = 0;

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: mockBottomInset, left: 0, right: 0, top: 0 }),
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
      height: 64,
      padding: 6,
    });
  });

  it('lays the items out in a row, so RTL mirrors their order', async () => {
    const view = await renderUi(bar());

    expect(flatStyle(view.getByTestId('floating-tab-bar').props.style)).toMatchObject({ flexDirection: 'row', gap: 4 });
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

  it('does not block touches outside the capsule', async () => {
    const view = await renderUi(bar());

    expect(view.getByTestId('floating-tab-bar-dock').props.pointerEvents).toBe('box-none');
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('FloatingTabBar.tsx')).toEqual([]);
  });
});
