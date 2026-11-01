import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { FloatingTabBarItem } from './FloatingTabBarItem';

// The icon's SymbolView, reduced to a View that exposes the names and tint the item passes it.
jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View: NativeView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: ({ name, tintColor }: { name: unknown; tintColor?: string }) =>
      createElement(NativeView, { name, tintColor, testID: 'tab-symbol' } as ComponentProps<typeof NativeView>),
  };
});

const labels = {
  ar: 'الرئيسية',
  en: 'Home',
} as const;

const homeIcon = { ios: 'house', android: 'home' } as const;
// Icons are hidden from screen readers, so queries have to opt in to see them.
const hidden = { includeHiddenElements: true };

describe('FloatingTabBarItem', () => {
  it('renders as a tab with its label and the selected state', async () => {
    const view = await renderUi(
      <FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected testID="tab-home" />,
    );

    const tab = view.getByRole('tab', { name: labels.ar });
    expect(tab).toBe(view.getByTestId('tab-home'));
    expect(tab.props.accessibilityState).toEqual({ selected: true });
    expect(view.getByText(labels.ar)).toBeOnTheScreen();
  });

  it('is not selected when selected is false', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected={false} testID="tab-home" />);

    expect(view.getByRole('tab', { name: labels.ar }).props.accessibilityState).toEqual({ selected: false });
  });

  it('draws the selected tab in a glassSelected pill, brand ink and the headline font file', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected testID="tab-home" />);
    const { colors, text } = themes.light;

    expect(flatStyle(view.getByTestId('tab-home').props.style)).toMatchObject({
      backgroundColor: colors.glassSelected,
      borderRadius: 26,
      minHeight: 44,
    });
    expect(flatStyle(view.getByText(labels.ar).props.style)).toMatchObject({
      color: colors.brand,
      fontFamily: text.headline.fontFamily,
    });
    expect(view.getByTestId('tab-symbol', hidden).props.tintColor).toBe(colors.brand);
  });

  it('draws an unselected tab with no pill, muted ink and the label font file', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected={false} testID="tab-home" />);
    const { colors, text } = themes.light;

    expect(flatStyle(view.getByTestId('tab-home').props.style).backgroundColor).toBe('transparent');
    expect(flatStyle(view.getByText(labels.ar).props.style)).toMatchObject({
      color: colors.inkMuted,
      fontFamily: text.label.fontFamily,
    });
    expect(view.getByTestId('tab-symbol', hidden).props.tintColor).toBe(colors.inkMuted);
  });

  it('draws the selected tab in the dark theme with dark brand ink', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected testID="tab-home" />, {
      theme: 'dark',
    });

    expect(flatStyle(view.getByTestId('tab-home').props.style).backgroundColor).toBe(themes.dark.colors.glassSelected);
    expect(view.getByTestId('tab-symbol', hidden).props.tintColor).toBe(themes.dark.colors.brand);
  });

  it('passes the destination icon names to the icon', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected={false} />);

    expect(view.getByTestId('tab-symbol', hidden).props.name).toEqual({ ios: 'house', android: 'home' });
  });

  it('keeps the target at least 44 pt', async () => {
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={jest.fn()} selected={false} testID="tab-home" />);

    expect(flatStyle(view.getByTestId('tab-home').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('calls onPress when the tab is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<FloatingTabBarItem icon={homeIcon} label={labels.ar} onPress={onPress} selected={false} />);

    fireEvent.press(view.getByRole('tab', { name: labels.ar }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('labels the tab in %s', async (locale) => {
    const view = await renderUi(
      <FloatingTabBarItem icon={homeIcon} label={labels[locale]} onPress={jest.fn()} selected={false} />,
      { locale },
    );

    expect(view.getByRole('tab', { name: labels[locale] })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('FloatingTabBarItem.tsx')).toEqual([]);
  });
});
