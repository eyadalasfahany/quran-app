import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { flatStyle, renderUi } from '../../../jest/render-ui';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui/textStyles';

import { FloatingTab } from './FloatingTab';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

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

  describe('selection haptic', () => {
    let platform: { restore: () => void } | undefined;

    beforeEach(() => {
      jest.mocked(Haptics.selectionAsync).mockClear();
    });

    afterEach(() => {
      platform?.restore();
      platform = undefined;
    });

    it('plays a selection tick on iOS when an unopened rail tab is pressed', async () => {
      platform = jest.replaceProperty(Platform, 'OS', 'ios');
      const onPress = jest.fn();
      const view = await renderUi(<FloatingTab icon={homeIcon} label="البحث" onPress={onPress} testID="listen" />);

      fireEvent.press(view.getByRole('tab', { name: 'البحث' }));

      expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('stays silent on iOS when the open tab is pressed again, but still passes the press on', async () => {
      platform = jest.replaceProperty(Platform, 'OS', 'ios');
      const onPress = jest.fn();
      const view = await renderUi(
        <FloatingTab icon={homeIcon} isFocused label="الرئيسية" onPress={onPress} testID="home" />,
      );

      fireEvent.press(view.getByRole('tab', { name: 'الرئيسية' }));

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('stays silent on Android, which has no tab-change haptic', async () => {
      platform = jest.replaceProperty(Platform, 'OS', 'android');
      const onPress = jest.fn();
      const view = await renderUi(<FloatingTab icon={homeIcon} label="الرئيسية" onPress={onPress} testID="home" />);

      fireEvent.press(view.getByRole('tab', { name: 'الرئيسية' }));

      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });

  it('caps the label at the bar text scale, so a large Dynamic Type size cannot push the rail out of its width', async () => {
    const view = await renderUi(<FloatingTab icon={homeIcon} label="الرئيسية" testID="home" />);

    expect(view.getByText('الرئيسية').props.maxFontSizeMultiplier).toBe(maxFontScale.bar);
  });
});
