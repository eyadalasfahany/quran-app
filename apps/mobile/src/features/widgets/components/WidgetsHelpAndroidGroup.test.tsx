import { Platform } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { WidgetsHelpAndroidGroup } from './WidgetsHelpAndroidGroup';

jest.mock('react-native-android-widget', () => ({
  requestPinWidget: jest.fn(async () => true),
}));

describe('WidgetsHelpAndroidGroup', () => {
  it('shows pin rows on Android', async () => {
    Platform.OS = 'android';
    const view = await renderUi(<WidgetsHelpAndroidGroup />);
    expect(view.getByTestId('widgets-help-pin-misbaha-pin')).toBeOnTheScreen();
  });

  it('omits pin rows on iOS', async () => {
    Platform.OS = 'ios';
    const view = await renderUi(<WidgetsHelpAndroidGroup />);
    expect(view.queryByTestId('widgets-help-pin-misbaha-pin')).toBeNull();
  });

  it.each(locales)('renders the section title in %s', async (locale) => {
    Platform.OS = 'android';
    const view = await renderUi(<WidgetsHelpAndroidGroup />, { locale });
    const title = locale === 'en' ? 'Android' : 'أندرويد';
    expect(view.getByRole('header', { name: title })).toBeOnTheScreen();
  });
});
