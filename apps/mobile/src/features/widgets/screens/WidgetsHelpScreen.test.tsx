import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpScreen } from './WidgetsHelpScreen';

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual<typeof import('react-native-safe-area-context')>('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
  };
});

jest.mock('expo-router', () => ({ router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() } }));

jest.mock('react-native-android-widget', () => ({
  requestPinWidget: jest.fn(async () => true),
}));

describe('WidgetsHelpScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'android';
  });

  it.each(locales)('renders the title and catalog in %s', async (locale) => {
    const view = await renderUi(<WidgetsHelpScreen />, { locale });
    expect(view.getByTestId('widgets-help-screen')).toBeOnTheScreen();
    expect(view.getByTestId('widgets-help-item-nextPrayer')).toBeOnTheScreen();
  });

  it('calls router.back from the header', async () => {
    const view = await renderUi(<WidgetsHelpScreen />);
    fireEvent.press(view.getByTestId('settings-back'));
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
