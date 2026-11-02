import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { i18n } from '@/core/i18n';

import { renderUi } from '../../../../jest/render-ui';

import { ReminderPermissionDialog } from './ReminderPermissionDialog';

const SHOWN = { includeHiddenElements: true } as const;

describe('ReminderPermissionDialog', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('explains that notifications are off and offers the device settings', async () => {
    const view = await renderUi(<ReminderPermissionDialog onClose={jest.fn()} visible />);

    expect(view.getByText('لا يمكن إرسال التذكيرات', SHOWN)).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'فتح الإعدادات', ...SHOWN })).toBeOnTheScreen();
  });

  it('opens the device settings and closes on confirm', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<ReminderPermissionDialog onClose={onClose} visible />);

    fireEvent.press(view.getByTestId('reminder-permission-dialog-confirm'));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on cancel without opening settings', async () => {
    const onClose = jest.fn();
    jest.mocked(Linking.openSettings).mockClear();
    const view = await renderUi(<ReminderPermissionDialog onClose={onClose} visible />);

    fireEvent.press(view.getByTestId('reminder-permission-dialog-cancel'));

    expect(Linking.openSettings).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
