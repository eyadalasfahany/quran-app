import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, locales, renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';
import { themes } from '@/core/theme';

import { SidebarItem } from './SidebarItem';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: (props: { name: unknown; size: number; tintColor: string }) =>
      createElement(View, { ...props, testID: 'sidebar-item-symbol' } as ComponentProps<typeof View>),
  };
});

const colors = themes.light.colors;

function item(props: Partial<ComponentProps<typeof SidebarItem>> = {}) {
  return (
    <SidebarItem
      androidIcon="menu_book"
      label="المصحف"
      onPress={() => undefined}
      selected={false}
      symbol="book"
      testID="item"
      {...props}
    />
  );
}

describe('SidebarItem', () => {
  it('renders an unselected tab with its label in ink', async () => {
    const view = await renderUi(item());
    const tab = view.getByRole('tab', { name: 'المصحف' });
    const label = flatStyle(view.getByText('المصحف').props.style);

    expect(tab.props.accessibilityState).toEqual({ selected: false });
    expect(flatStyle(tab.props.style)).toMatchObject({ backgroundColor: 'transparent', minHeight: 48 });
    expect(label).toMatchObject({ ...themes.light.text.headline, color: colors.ink });
    expect(label.fontWeight).toBeUndefined();
  });

  it('marks the selected tab and tints it brand on glassSelected', async () => {
    const view = await renderUi(item({ selected: true }));
    const tab = view.getByRole('tab', { name: 'المصحف' });

    expect(tab.props.accessibilityState).toEqual({ selected: true });
    expect(flatStyle(tab.props.style).backgroundColor).toBe(colors.glassSelected);
    expect(flatStyle(view.getByText('المصحف').props.style).color).toBe(colors.brand);
    expect(view.getByTestId('sidebar-item-symbol').props.tintColor).toBe(colors.brand);
  });

  it('draws the platform symbol at the large icon size', async () => {
    const view = await renderUi(item());
    const symbol = view.getByTestId('sidebar-item-symbol');

    expect(symbol.props.name).toEqual({ ios: 'book', android: 'menu_book' });
    expect(symbol.props.size).toBe(themes.light.size.iconLg);
    expect(symbol.props.tintColor).toBe(colors.ink);
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(item({ onPress }));

    await fireEvent.press(view.getByRole('tab'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('highlights while a pointer hovers over it', async () => {
    const view = await renderUi(item());

    await fireEvent(view.getByTestId('item'), 'hoverIn');
    expect(flatStyle(view.getByTestId('item').props.style).backgroundColor).toBe(colors.glassSelected);

    await fireEvent(view.getByTestId('item'), 'hoverOut');
    expect(flatStyle(view.getByTestId('item').props.style).backgroundColor).toBe('transparent');
  });

  it.each(locales)('lays the icon and label in a logical row that mirrors in RTL (%s)', async (locale) => {
    const view = await renderUi(item({ label: locale }), { locale });

    expect(view.getByRole('tab', { name: locale })).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('item').props.style)).toMatchObject({
      flexDirection: 'row',
      paddingHorizontal: themes.light.space[3],
    });
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SidebarItem.tsx')).toEqual([]);
  });
});
