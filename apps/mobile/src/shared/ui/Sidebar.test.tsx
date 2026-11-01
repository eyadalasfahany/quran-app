import { fireEvent, within } from '@testing-library/react-native';
import type { ReactTestRendererNode } from 'react-test-renderer';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
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
    { androidIcon: 'account_circle', key: 'my-quran', label: 'مصحفي', onPress: () => onPress('my-quran'), selected: true, symbol: 'person.crop.circle', testID: 'sidebar-my-quran' },
    { androidIcon: 'home', key: 'home', label: 'الرئيسية', onPress: () => onPress('home'), selected: false, symbol: 'house', testID: 'sidebar-home' },
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
    expect(view.getAllByRole('tab')).toHaveLength(3);
    expect(view.getByRole('tab', { name: 'مصحفي' }).props.accessibilityState).toEqual({ selected: true });
    expect(view.getByRole('tab', { name: 'الرئيسية' }).props.accessibilityState).toEqual({ selected: false });
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

  it('spaces its items 8 pt apart, as #ExpandedHome draws the sidebar (gap space-2)', async () => {
    const view = await renderUi(sidebar());

    expect(flatStyle(view.getByTestId('sidebar').props.style).gap).toBe(themes.light.space[2]);
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

    await fireEvent.press(view.getByRole('tab', { name: 'الرئيسية' }));

    expect(onPress).toHaveBeenCalledWith('home');
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
    expect(view.getAllByRole('tab').map((tab) => tab.props.testID)).toEqual(['sidebar-my-quran', 'sidebar-home', 'sidebar-mushaf']);
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
      if (testID === 'sidebar-search' || testID === 'sidebar-my-quran') {
        hostOrder.push(testID);
      }
      (node.children ?? []).forEach(walk);
    };
    walk(view.toJSON());
    expect(hostOrder).toEqual(['sidebar-search', 'sidebar-my-quran']);

    await fireEvent.press(view.getByRole('button', { name: 'ابحث في القرآن' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(view.getAllByRole('tab')).toHaveLength(3);
  });

  it('has no search field when search is not given', async () => {
    const view = await renderUi(sidebar());

    expect(view.queryByTestId('sidebar-search')).toBeNull();
    expect(view.queryByRole('button', { name: 'ابحث في القرآن' })).toBeNull();
  });

  describe('footer', () => {
    function withFooter() {
      return (
        <SafeAreaProvider initialMetrics={{ frame: { height: 800, width: 900, x: 0, y: 0 }, insets }}>
          <Sidebar footer={<Text>mini footer</Text>} items={entries()} label="التنقل الرئيسي" />
        </SafeAreaProvider>
      );
    }

    it('renders the footer at the bottom, below the last destination', async () => {
      const view = await renderUi(withFooter());
      const order: string[] = [];
      const walk = (node: ReactTestRendererNode | null | undefined): void => {
        if (!node || typeof node !== 'object') {
          return;
        }
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const testID = node.props.testID as string | undefined;
        if (testID === 'sidebar-mushaf' || testID === 'sidebar-footer' || testID === 'sidebar-home' || testID === 'sidebar-my-quran') {
          order.push(testID);
        }
        (node.children ?? []).forEach(walk);
      };
      walk(view.toJSON());

      expect(order).toEqual(['sidebar-my-quran', 'sidebar-home', 'sidebar-mushaf', 'sidebar-footer']);
      expect(within(view.getByTestId('sidebar-footer')).getByText('mini footer')).toBeOnTheScreen();
    });

    it('renders nothing extra when no footer is given', async () => {
      const view = await renderUi(sidebar());

      expect(view.queryByTestId('sidebar-footer')).toBeNull();
      expect(view.queryByText('mini footer')).toBeNull();
    });

    it('keeps the destinations as tabs with the footer present', async () => {
      const view = await renderUi(withFooter());

      expect(view.getAllByRole('tab')).toHaveLength(3);
    });
  });

  describe('scrolling and side insets', () => {
    function withInsets(side: { left: number; right: number }, footer?: string) {
      return (
        <SafeAreaProvider initialMetrics={{ frame: { height: 411, width: 900, x: 0, y: 0 }, insets: { ...insets, ...side } }}>
          <Sidebar footer={footer ? <Text>{footer}</Text> : undefined} items={entries()} label="التنقل الرئيسي" />
        </SafeAreaProvider>
      );
    }

    it('keeps the destinations in a vertical scroll view that fills the sidebar', async () => {
      const view = await renderUi(withInsets({ left: 0, right: 0 }));
      const scroll = view.getByTestId('sidebar-scroll');

      expect(scroll.props.showsVerticalScrollIndicator).toBe(false);
      expect(flatStyle(scroll.props.style)).toMatchObject({ flex: 1 });
      expect(within(scroll).getAllByRole('tab')).toHaveLength(3);
    });

    it('pins the footer outside the scroll view, so it stays at the bottom when the list scrolls', async () => {
      const view = await renderUi(withInsets({ left: 0, right: 0 }, 'mini footer'));

      expect(within(view.getByTestId('sidebar-scroll')).queryByTestId('sidebar-footer')).toBeNull();
      expect(view.getByTestId('sidebar-footer')).toBeOnTheScreen();
    });

    it('spaces the scrolling destinations 8 pt apart', async () => {
      const view = await renderUi(withInsets({ left: 0, right: 0 }));

      expect(flatStyle(view.getByTestId('sidebar-scroll').props.contentContainerStyle)).toMatchObject({
        gap: themes.light.space[2],
      });
    });

    it('adds the leading and trailing insets to the sidebar edges in LTR', async () => {
      const view = await renderUi(withInsets({ left: 44, right: 12 }), { locale: 'en' });
      const container = flatStyle(view.getByTestId('sidebar').parent?.props.style);

      expect(container).toMatchObject({
        paddingEnd: 12,
        paddingStart: 44 + themes.light.space[4],
      });
    });

    it('mirrors the side insets in RTL, so the notch side is the trailing one', async () => {
      const view = await renderUi(withInsets({ left: 44, right: 12 }), { locale: 'ar' });
      const container = flatStyle(view.getByTestId('sidebar').parent?.props.style);

      expect(container).toMatchObject({
        paddingEnd: 44,
        paddingStart: 12 + themes.light.space[4],
      });
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('Sidebar.tsx')).toEqual([]);
  });
});
