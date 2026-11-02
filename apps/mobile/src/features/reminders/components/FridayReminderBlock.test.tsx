import { fireEvent, waitFor } from '@testing-library/react-native';

import { i18n } from '@/core/i18n';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { useHasReminderLocation } from '@/features/azkar/reminders/hooks';
import { ensureReminderPermission } from '@/features/notifications/permission';

import { renderUi } from '../../../../jest/render-ui';
import { resyncGoalReminders } from '../data/goal-sync';

import { FridayReminderBlock } from './FridayReminderBlock';

jest.mock('@/features/azkar/reminders/hooks', () => ({ useHasReminderLocation: jest.fn(() => true) }));
jest.mock('@/features/notifications/permission', () => ({ ensureReminderPermission: jest.fn(() => Promise.resolve(true)) }));
jest.mock('../data/goal-sync', () => ({ resyncGoalReminders: jest.fn(() => Promise.resolve(null)) }));
jest.mock('./ReminderPermissionDialog', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  return { ReminderPermissionDialog: (props: { visible: boolean }) => (props.visible ? createElement('Denied', { testID: 'denied' }) : null) };
});

describe('FridayReminderBlock', () => {
  beforeEach(async () => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.mocked(useHasReminderLocation).mockReturnValue(true);
    jest.mocked(ensureReminderPermission).mockResolvedValue(true);
    await i18n.changeLanguage('ar');
  });

  it('is off by default, with no mode options shown', async () => {
    const view = await renderUi(<FridayReminderBlock granted />);

    expect(view.getByTestId('reminder-friday').props.value).toBe(false);
    expect(view.queryByText('وقت الظهر')).toBeNull();
  });

  it('turns on after permission and offers the Dhuhr time by default', async () => {
    const view = await renderUi(<FridayReminderBlock granted />);

    fireEvent(view.getByTestId('reminder-friday'), 'valueChange', true);

    await waitFor(() => expect(view.getByText('وقت الظهر')).toBeOnTheScreen());
    expect(storage.getString(storageKeys.reminders.friday)).toContain('"mode":"dhuhr"');
    expect(resyncGoalReminders).toHaveBeenCalled();
  });

  it('stays off and shows the permission notice when notifications are refused', async () => {
    jest.mocked(ensureReminderPermission).mockResolvedValueOnce(false);
    const view = await renderUi(<FridayReminderBlock granted={false} />);

    fireEvent(view.getByTestId('reminder-friday'), 'valueChange', true);

    await waitFor(() => expect(view.getByTestId('denied')).toBeOnTheScreen());
    expect(storage.getString(storageKeys.reminders.friday)).toBeUndefined();
  });

  it('says a location is needed for the Dhuhr time when none is known', async () => {
    storage.set(storageKeys.reminders.friday, JSON.stringify({ enabled: true, mode: 'dhuhr', clockTime: null }));
    jest.mocked(useHasReminderLocation).mockReturnValue(false);

    const view = await renderUi(<FridayReminderBlock granted />);

    expect(view.getByText('حدّد موقعك لاستخدام وقت الظهر')).toBeOnTheScreen();
  });

  it('shows the time row in clock mode, asking for a time with none chosen', async () => {
    storage.set(storageKeys.reminders.friday, JSON.stringify({ enabled: true, mode: 'clock', clockTime: null }));

    const view = await renderUi(<FridayReminderBlock granted />);

    expect(view.getAllByText('اختر وقتًا').length).toBeGreaterThan(0);
  });

  it('switches off and re-plans', async () => {
    storage.set(storageKeys.reminders.friday, JSON.stringify({ enabled: true, mode: 'dhuhr', clockTime: null }));
    const view = await renderUi(<FridayReminderBlock granted />);

    fireEvent(view.getByTestId('reminder-friday'), 'valueChange', false);

    expect(storage.getString(storageKeys.reminders.friday)).toContain('"enabled":false');
    expect(resyncGoalReminders).toHaveBeenCalled();
  });
});
