import { fireEvent } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { flatStyle, renderUi } from '../../../jest/render-ui';
import { themes } from '@/core/theme';

import { FloatingTab } from './FloatingTab';

jest.mock('expo-symbols', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { View: NativeView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    SymbolView: ({ tintColor }: { tintColor?: string }) =>
      createElement(NativeView, { tintColor, testID: 'tab-symbol' } as ComponentProps<typeof NativeView>),
  };
});

const homeIcon = { ios: 'house', android: 'home' } as const;

describe('FloatingTab', () => {
  it('shows the trigger state as the selected tab', async () => {
    const view = await renderUi(
      <FloatingTab icon={homeIcon} isFocused label="الرئيسية" onPress={jest.fn()} testID="home" />,
    );

    expect(view.getByRole('tab', { name: 'الرئيسية' }).props.accessibilityState).toEqual({ selected: true });
    expect(flatStyle(view.getByText('الرئيسية').props.style).color).toBe(themes.light.colors.brand);
  });

  it('is unselected when the trigger is not focused, and when it gives no state at all', async () => {
    const view = await renderUi(<FloatingTab icon={homeIcon} label="الرئيسية" testID="home" />);

    expect(view.getByRole('tab', { name: 'الرئيسية' }).props.accessibilityState).toEqual({ selected: false });
  });

  it('passes the trigger press through to the tab', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<FloatingTab icon={homeIcon} label="الرئيسية" onPress={onPress} testID="home" />);

    fireEvent.press(view.getByRole('tab', { name: 'الرئيسية' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps the destination testID on the tab', async () => {
    const view = await renderUi(<FloatingTab icon={homeIcon} label="الرئيسية" testID="home" />);

    expect(view.getByRole('tab', { name: 'الرئيسية' }).props.testID).toBe('home');
  });
});
