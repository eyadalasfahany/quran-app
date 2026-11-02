import { fireEvent, waitFor } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { ensureReminderPermission } from '@/features/notifications/permission';

import { renderUi } from '../../../../jest/render-ui';
import { resyncGoalReminders } from '../data/goal-sync';

import { MisbahaReminderBlock } from './MisbahaReminderBlock';

jest.mock('@/features/notifications/permission', () => ({ ensureReminderPermission: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../data/goal-sync', () => ({ resyncGoalReminders: jest.fn(() => Promise.resolve(null)) }));

describe('MisbahaReminderBlock', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(ensureReminderPermission).mockResolvedValue(true);
    await i18n.changeLanguage('ar');
  });

  it('is off by default, with no time row', async () => {
    const view = await renderUi(<MisbahaReminderBlock granted />);

    expect(view.getByTestId('reminder-misbaha').props.value).toBe(false);
    expect(view.queryByText('اختر وقتًا')).toBeNull();
  });

  it('turns on and asks for a time, suggesting none', async () => {
    const view = await renderUi(<MisbahaReminderBlock granted />);

    fireEvent(view.getByTestId('reminder-misbaha'), 'valueChange', true);

    await waitFor(() => expect(view.getAllByText('اختر وقتًا').length).toBeGreaterThan(0));
    expect(resyncGoalReminders).toHaveBeenCalled();
  });

  it('shows the chosen time in the subtitle', async () => {
    storage.set(storageKeys.reminders.misbaha, JSON.stringify({ enabled: true, clockTime: '21:30' }));

    const view = await renderUi(<MisbahaReminderBlock granted />);

    expect(view.getByText(/كل يوم/)).toBeOnTheScreen();
  });

  it('keeps the switch off when permission is refused', async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValueOnce(false);
    const view = await renderUi(<MisbahaReminderBlock granted={false} />);

    fireEvent(view.getByTestId('reminder-misbaha'), 'valueChange', true);

    await waitFor(() => expect(storage.getString(storageKeys.reminders.misbaha)).toBeUndefined());
  });
});
