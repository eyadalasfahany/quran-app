import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { renderUi } from '../../../../jest/render-ui';

import { PrayerPermissionDialog } from './PrayerPermissionDialog';

describe('PrayerPermissionDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the refusal title, body and the Settings action when visible', async () => {
    const view = await renderUi(<PrayerPermissionDialog onClose={jest.fn()} visible />);

    expect(view.getByText('لا يمكن إرسال التذكيرات')).toBeOnTheScreen();
    expect(view.getByText('تحتاج طيبة إلى إذن لإرسال التذكيرات اليومية. يمكنك تفعيلها من إعدادات الجهاز.')).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'فتح الإعدادات' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إلغاء' })).toBeOnTheScreen();
  });

  it('draws the bell-with-slash badge', async () => {
    const view = await renderUi(<PrayerPermissionDialog onClose={jest.fn()} visible />);

    expect(view.getByTestId('prayer-permission-dialog-icon-glyph', { includeHiddenElements: true }).props.children.props.name).toEqual({
      ios: 'bell.slash',
      android: 'notifications_off',
    });
  });

  it('opens the Settings app and closes when the Settings action is pressed', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PrayerPermissionDialog onClose={onClose} visible />);

    fireEvent.press(view.getByRole('button', { name: 'فتح الإعدادات' }));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes without opening Settings on cancel', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<PrayerPermissionDialog onClose={onClose} visible />);

    fireEvent.press(view.getByRole('button', { name: 'إلغاء' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(Linking.openSettings).not.toHaveBeenCalled();
  });

  it('renders no dialog while closed', async () => {
    const view = await renderUi(<PrayerPermissionDialog onClose={jest.fn()} visible={false} />);

    expect(view.queryByText('لا يمكن إرسال التذكيرات')).toBeNull();
  });

  it.each([
    ['ar', 'لا يمكن إرسال التذكيرات', 'فتح الإعدادات'],
    ['en', 'Cannot send reminders', 'Open Settings'],
  ] as const)('renders the copy in %s, with the dialog test id', async (locale, title, action) => {
    const view = await renderUi(<PrayerPermissionDialog onClose={jest.fn()} visible />, { locale });

    expect(view.getByTestId('prayer-permission-dialog')).toBeOnTheScreen();
    expect(view.getByText(title)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: action })).toBeOnTheScreen();
  });
});
