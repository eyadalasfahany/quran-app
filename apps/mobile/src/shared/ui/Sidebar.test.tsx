import { fireEvent } from '@testing-library/react-native';
import type { ReactTestRendererNode } from 'react-test-renderer';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { Sidebar, type SidebarEntry } from './Sidebar';

const mockLiquidGlass = jest.fn(() => false);

jest.mock('expo-glass-effect', () => ({
  ...jest.requireActual('expo-glass-effect'),
  isLiquidGlassAvailable: () => mockLiquidGlass(),
}));

const insets = { bottom: 10, left: 0, right: 0, top: 20 };

function entries(onPress: (key: string) => void = () => undefined): SidebarEntry[] {
  return [
    { androidIcon: 'home', key: 'home', label: 'الرئيسية', onPress: () => onPress('home'), selected: true, symbol: 'house', testID: 'sidebar-home' },
    { androidIcon: 'menu_book', key: 'mushaf', label: 'المصحف', onPress: () => onPress('mushaf'), selected: false, symbol: 'book', testID: 'sidebar-mushaf' },
  ];
}

function sidebar(items: SidebarEntry[] = entries(), search?: { label: string; onPress: () => void }) {
  return (
    <SafeAreaProvider initialMetrics={{ frame: { height: 800, width: 900, x: 0, y: 0 }, insets }}>
      <Sidebar items={items} label="التنقل الرئيسي" search={search} />
    </SafeAreaProvider>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    mockLiquidGlass.mockReturnValue(false);
    jest.mocked(AccessibilityInfo.isReduceTransparencyEnabled).mockResolvedValue(false);
  });

  it('is a labelled tab list with one tab per destination', async () => {
    const view = await renderUi(sidebar());

    expect(view.getByTestId('sidebar').props).toMatchObject({
      accessibilityLabel: 'التنقل الرئيسي',
      accessibilityRole: 'tablist',
    });
    expect(view.getAllByRole('tab')).toHaveLength(2);
    expect(view.getByRole('tab', { name: 'الرئيسية' }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByRole('tab', { name: 'المصحف' }).props.accessibilityState).toEqual({ selected: false });
  });

  it('is a 300 pt glass surface, solid with a line hairline when glass is unavailable', async () => {
    const view = await renderUi(sidebar());

    expect(flatStyle(view.getByTestId('sidebar').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.glassFallback,
      borderColor: themes.light.colors.line,
      borderRadius: themes.light.radius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      width: themes.light.size.sidebar,
    });
  });

  it('uses native glass when it is available', async () => {
    mockLiquidGlass.mockReturnValue(true);
    const view = await renderUi(sidebar());

    expect(view.getByTestId('sidebar-glass').props.glassEffectStyle).toBe('regular');
    expect(flatStyle(view.getByTestId('sidebar').props.style).width).toBe(themes.light.size.sidebar);
  });

  it('navigates when a destination is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(sidebar(entries(onPress)));

    await fireEvent.press(view.getByRole('tab', { name: 'المصحف' }));

    expect(onPress).toHaveBeenCalledWith('mushaf');
  });

  it.each(locales)('insets from the leading edge and the safe area in %s', async (locale) => {
    const view = await renderUi(sidebar(), { locale });
    const container = flatStyle(view.getByTestId('sidebar').parent?.props.style);

    expect(container).toMatchObject({
      paddingBottom: insets.bottom + themes.light.space[4],
      paddingStart: themes.light.space[4],
      paddingTop: insets.top + themes.light.space[4],
    });
    expect(container.paddingLeft).toBeUndefined();
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual(['sidebar-home', 'sidebar-mushaf']);
  });

  it('puts the search field first, above the tabs, when search is given', async () => {
    const onPress = jest.fn();
    const view = await renderUi(sidebar(entries(), { label: 'ابحث في القرآن', onPress }));

    const hostOrder: string[] = [];
    const walk = (node: ReactTestRendererNode | null | undefined): void => {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      const testID = node.props.testID as string | undefined;
      if (testID === 'sidebar-search' || testID === 'sidebar-home') {
        hostOrder.push(testID);
      }
      (node.children ?? []).forEach(walk);
    };
    walk(view.toJSON());
    expect(hostOrder).toEqual(['sidebar-search', 'sidebar-home']);

    await fireEvent.press(view.getByRole('button', { name: 'ابحث في القرآن' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.getAllByRole('tab')).toHaveLength(2);
  });

  it('has no search field when search is not given', async () => {
    const view = await renderUi(sidebar());

    expect(view.queryByTestId('sidebar-search')).toBeNull();
    expect(view.queryByRole('button', { name: 'ابحث في القرآن' })).toBeNull();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Sidebar.tsx')).toEqual([]);
  });
});
