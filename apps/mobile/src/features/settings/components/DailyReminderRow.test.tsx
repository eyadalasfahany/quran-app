import * as Notifications from 'expo-notifications';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { DailyReminderRow } from './DailyReminderRow';

// The dialog's notice fades in, so until its animation ends its elements count as hidden to the query.
const SHOWN = { includeHiddenElements: true } as const;

describe('DailyReminderRow', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders off without a time subtitle by default', async () => {
    const view = await renderUi(<DailyReminderRow />);

    expect(view.getByTestId('daily-reminder-toggle-row')).toBeOnTheScreen();
    expect(view.getByTestId('daily-reminder-toggle').props.value).toBe(false);
    expect(view.queryByText(/كل يوم/)).toBeNull();
  });

  it('shows the stored time in the subtitle when on', async () => {
    storage.set(storageKeys.dailyReminder, true);
    storage.set(storageKeys.dailyReminderTime, '21:00');

    const view = await renderUi(<DailyReminderRow />);

    expect(view.getByTestId('daily-reminder-toggle').props.value).toBe(true);
    expect(view.getByText(/كل يوم/)).toBeOnTheScreen();
  });

  it('turning on with permission granted stores the preference and schedules', async () => {
    const view = await renderUi(<DailyReminderRow />);

    fireEvent(view.getByTestId('daily-reminder-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(storage.getBoolean(storageKeys.dailyReminder)).toBe(true);
    });
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('asks for permission when it is not yet decided', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    const view = await renderUi(<DailyReminderRow />);
    fireEvent(view.getByTestId('daily-reminder-toggle'), 'valueChange', true);

    await waitFor(() => {
      expect(storage.getBoolean(storageKeys.dailyReminder)).toBe(true);
    });
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('keeps the toggle off and offers device settings when permission is denied', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    const view = await renderUi(<DailyReminderRow />, { locale: 'en' });
    fireEvent(view.getByTestId('daily-reminder-toggle'), 'valueChange', true);

    // The notice fades in, so it counts as hidden to the query until its animation ends.
    await waitFor(() => {
      expect(view.getByText('Cannot send reminders', SHOWN)).toBeOnTheScreen();
    });
    expect(view.getByTestId('daily-reminder-denied-icon-glyph', SHOWN).props.children.props.name).toEqual({
      ios: 'bell.slash',
      android: 'notifications_off',
    });
    expect(storage.getBoolean(storageKeys.dailyReminder)).toBeUndefined();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();

    fireEvent.press(view.getByRole('button', { name: 'Open Settings', ...SHOWN }));
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('closes the permission notice with Cancel, and opens no settings', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);

    const view = await renderUi(<DailyReminderRow />, { locale: 'en' });
    fireEvent(view.getByTestId('daily-reminder-toggle'), 'valueChange', true);
    await waitFor(() => {
      expect(view.getByText('Cannot send reminders', SHOWN)).toBeOnTheScreen();
    });

    fireEvent.press(view.getByRole('button', { name: 'Cancel', ...SHOWN }));

    expect(Linking.openSettings).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(view.queryByText('Cannot send reminders', SHOWN)).toBeNull();
    });
  });

  it('turning off cancels the scheduled reminder', async () => {
    storage.set(storageKeys.dailyReminder, true);
    storage.set(storageKeys.dailyReminderNotificationId, 'old-id');

    const view = await renderUi(<DailyReminderRow />);
    fireEvent(view.getByTestId('daily-reminder-toggle'), 'valueChange', false);

    await waitFor(() => {
      expect(storage.getBoolean(storageKeys.dailyReminder)).toBe(false);
    });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
  });

  it('opens the picker from the row and stores the chosen time', async () => {
    storage.set(storageKeys.dailyReminder, true);
    storage.set(storageKeys.dailyReminderTime, '21:00');

    const view = await renderUi(<DailyReminderRow />);
    fireEvent.press(view.getByTestId('daily-reminder-toggle-row'));

    const picker = await view.findByTestId('daily-reminder-picker');
    const chosen = new Date();
    chosen.setHours(6, 30, 0, 0);
    fireEvent(picker, 'change', { type: 'set' }, chosen);
    await waitFor(() => expect(view.getByTestId('daily-reminder-picker').props.value).toBe(chosen));
    fireEvent.press(view.getByTestId('daily-reminder-picker-done'));

    await waitFor(() => expect(view.queryByTestId('daily-reminder-picker')).toBeNull());
    expect(storage.getString(storageKeys.dailyReminderTime)).toBe('06:30');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('does not open the picker from the row while off', async () => {
    const view = await renderUi(<DailyReminderRow />);

    fireEvent.press(view.getByTestId('daily-reminder-toggle-row'));

    expect(view.queryByTestId('daily-reminder-picker')).toBeNull();
  });

  it('exposes the switch with its accessible role and label', async () => {
    const view = await renderUi(<DailyReminderRow />);

    expect(view.getByRole('switch', { name: 'تذكير بالورد اليومي' })).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<DailyReminderRow />, { locale });

    const expectedTitle = locale === 'en' ? 'Daily reading reminder' : 'تذكير بالورد اليومي';
    expect(view.getByRole('switch', { name: expectedTitle })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/DailyReminderRow.tsx')).toEqual([]);
  });
});
