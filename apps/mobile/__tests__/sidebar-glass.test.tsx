import { act, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { themes } from '@/core/theme';
import { Sidebar, type SidebarEntry } from '@/shared/ui';

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const item: SidebarEntry = {
  androidIcon: 'home',
  key: 'home',
  label: 'Home',
  onPress: () => undefined,
  selected: true,
  symbol: 'house',
  testID: 'sidebar-home',
};

function flatten(style: StyleProp<ViewStyle>): ViewStyle {
  return StyleSheet.flatten(style) ?? {};
}

function renderSidebar(ui: ReactNode) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { height: 800, width: 900, x: 0, y: 0 },
        insets: { bottom: 0, left: 0, right: 0, top: 0 },
      }}
    >
      {ui}
    </SafeAreaProvider>,
  );
}

describe('sidebar glass', () => {
  beforeEach(() => {
    mockLiquidGlass.mockReset();
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockReset();
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
    jest.mocked(AccessibilityInfo.addEventListener).mockClear();
  });

  it('uses native glass when it is available and reduce transparency is off', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderSidebar(<Sidebar items={[item]} label="Main" />);
    const style = flatten(view.getByTestId('sidebar').props.style);

    expect(view.getByTestId('sidebar').props.glassEffectStyle).toBe('regular');
    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth).toBeUndefined();
    expect(style.boxShadow).toBeUndefined();
  });

  it.each([
    ['glass is unavailable', false, false],
    ['reduce transparency is on', true, true],
  ] as const)('uses the solid fallback when %s', async (_label, available, reduced) => {
    mockLiquidGlass.mockReturnValue(available);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(reduced);
    const view = await renderSidebar(<Sidebar items={[item]} label="Main" />);

    expect(view.getByTestId('sidebar').props.glassEffectStyle).toBeUndefined();
    expect(flatten(view.getByTestId('sidebar').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.glassFallback,
      borderColor: themes.light.colors.line,
      borderWidth: StyleSheet.hairlineWidth,
    });
  });

  it('switches to the solid fallback when reduce transparency turns on', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderSidebar(<Sidebar items={[item]} label="Main" />);
    const listener = jest
      .mocked(AccessibilityInfo.addEventListener)
      .mock.calls.find(([event]) => event === 'reduceTransparencyChanged')?.[1];

    expect(view.getByTestId('sidebar').props.glassEffectStyle).toBe('regular');

    await act(async () => {
      listener?.(true);
    });

    expect(view.getByTestId('sidebar').props.glassEffectStyle).toBeUndefined();
    expect(flatten(view.getByTestId('sidebar').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.glassFallback,
      borderColor: themes.light.colors.line,
      borderWidth: StyleSheet.hairlineWidth,
    });
  });
});
