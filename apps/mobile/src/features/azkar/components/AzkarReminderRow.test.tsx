import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { useAzkarReminder, useHasReminderLocation } from '../reminders/hooks';
import { listReminders, saveReminder, type AzkarReminder } from '../reminders/reminders-repository';
import { resyncAzkarReminders } from '../reminders/resync';

import { AzkarReminderRow } from './AzkarReminderRow';

jest.mock('expo-router', () => ({
  ...jest.requireActual('expo-router'),
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

jest.mock('../reminders/hooks', () => ({
  useAzkarReminder: jest.fn(),
  useHasReminderLocation: jest.fn(),
  useNotificationsGranted: jest.fn(() => ({ granted: true, refresh: jest.fn() })),
}));

jest.mock('../reminders/reminders-repository', () => ({
  ...jest.requireActual('../reminders/reminders-repository'),
  saveReminder: jest.fn(),
  listReminders: jest.fn(() => []),
}));

jest.mock('../reminders/resync', () => ({
  resyncAzkarReminders: jest.fn(() => Promise.resolve(null)),
}));

function reminder(overrides: Partial<AzkarReminder> = {}): AzkarReminder {
  return {
    id: 'reminder-1',
    targetType: 'category',
    targetKey: 'morning',
    enabled: true,
    triggerType: 'clock',
    clockTime: '06:30',
    prayer: null,
    offsetMinutes: null,
    notificationIds: [],
    updatedAt: 1,
    ...overrides,
  };
}

/** A full pool: the newest reminder is the one that would not fit. */
function fullPool(): AzkarReminder[] {
  return Array.from({ length: 23 }, (_, index) => reminder({
    id: `other-${index}`,
    targetType: 'entry',
    targetKey: `other-${index}`,
    triggerType: 'prayer_relative',
    clockTime: null,
    prayer: 'asr',
    offsetMinutes: 0,
    updatedAt: index + 1,
  }));
}

function renderRow(props: Partial<Parameters<typeof AzkarReminderRow>[0]> = {}, locale: 'ar' | 'en' = 'ar') {
  return renderUi(
    <AzkarReminderRow targetKey="morning" targetType="category" {...props} />,
    { locale },
  );
}

/** The switch's state in the saved row: the last write's `enabled`, or undefined when nothing was written. */
function lastSaved(): Record<string, unknown> | undefined {
  return jest.mocked(saveReminder).mock.calls.at(-1)?.[0] as unknown as Record<string, unknown> | undefined;
}

describe('AzkarReminderRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAzkarReminder).mockReturnValue(null);
    jest.mocked(useHasReminderLocation).mockReturnValue(true);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({ granted: true } as never);
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is off, with no trigger controls, when nothing is saved', async () => {
    await renderRow();

    expect(screen.getByRole('switch', { name: 'تنبيه يومي' })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-reminder-row').props.value).toBe(false);
    expect(screen.queryByTestId('azkar-reminder-row-trigger')).toBeNull();
    expect(screen.queryByTestId('azkar-reminder-row-time')).toBeNull();
  });

  it('turns on with permission and saves the choice without recommending a time', async () => {
    await renderRow();

    fireEvent(screen.getByTestId('azkar-reminder-row'), 'valueChange', true);

    await waitFor(() => expect(saveReminder).toHaveBeenCalledTimes(1));
    expect(lastSaved()).toMatchObject({
      targetType: 'category',
      targetKey: 'morning',
      enabled: true,
      triggerType: 'clock',
      clockTime: null,
      prayer: null,
      offsetMinutes: null,
    });
    expect(resyncAzkarReminders).toHaveBeenCalledTimes(1);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('keeps the switch off when permission is refused, and says why with the daily reminder alert', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const onPermissionDenied = jest.fn();
    await renderRow({ onPermissionDenied });

    fireEvent(screen.getByTestId('azkar-reminder-row'), 'valueChange', true);

    await waitFor(() => expect(Alert.alert).toHaveBeenCalledTimes(1));
    // The revert: nothing was written, so the row never turned on and nothing was scheduled.
    expect(saveReminder).not.toHaveBeenCalled();
    expect(resyncAzkarReminders).not.toHaveBeenCalled();
    expect(screen.getByTestId('azkar-reminder-row').props.value).toBe(false);
    expect(onPermissionDenied).toHaveBeenCalledTimes(1);

    const buttons = jest.mocked(Alert.alert).mock.calls[0]?.[2] ?? [];
    buttons.find((button) => button.style !== 'cancel')?.onPress?.();
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('refuses to turn a reminder on when the pool is full: alerts, keeps the switch off, writes nothing', async () => {
    // An entry is the newest in the plan: categories are planned first, so a category would keep its slot.
    jest.mocked(listReminders).mockReturnValue(fullPool());
    jest.mocked(useAzkarReminder).mockReturnValue(reminder({ enabled: false, targetType: 'entry', targetKey: 'new-entry' }));
    await renderRow({ targetType: 'entry', targetKey: 'new-entry' });

    fireEvent(screen.getByTestId('azkar-reminder-row'), 'valueChange', true);

    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(jest.mocked(Alert.alert).mock.calls[0]?.[0]).toBe('بلغت الحد الأقصى للتذكيرات');
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(saveReminder).not.toHaveBeenCalled();
    expect(screen.getByTestId('azkar-reminder-row').props.value).toBe(false);
  });

  it('turns off when the pool is full: turning off always fits', async () => {
    jest.mocked(listReminders).mockReturnValue(fullPool());
    jest.mocked(useAzkarReminder).mockReturnValue(reminder());
    await renderRow();

    fireEvent(screen.getByTestId('azkar-reminder-row'), 'valueChange', false);

    expect(Alert.alert).not.toHaveBeenCalled();
    expect(lastSaved()).toMatchObject({ enabled: false });
  });

  it('turns off and saves the disabled choice', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder());
    await renderRow();

    fireEvent(screen.getByTestId('azkar-reminder-row'), 'valueChange', false);

    expect(lastSaved()).toMatchObject({ enabled: false, clockTime: '06:30' });
  });

  it('shows the saved clock time when on', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder({ clockTime: '06:30' }));
    await renderRow();

    expect(screen.getByTestId('azkar-reminder-row-trigger-clock')).toBeOnTheScreen();
    expect(screen.getByText(/٦:٣٠|6:30/)).toBeOnTheScreen();
  });

  it('asks for a time when the clock trigger has none yet', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder({ clockTime: null }));
    await renderRow();

    expect(screen.getByText('اختر وقتًا')).toBeOnTheScreen();
  });

  it('saves a clock time picked in the time sheet', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder({ clockTime: null }));
    await renderRow();

    fireEvent.press(screen.getByTestId('azkar-reminder-row-time'));
    const picker = await screen.findByTestId('azkar-reminder-row-picker');
    const chosen = new Date();
    chosen.setHours(7, 15, 0, 0);
    fireEvent(picker, 'change', { type: 'set' }, chosen);
    await waitFor(() => expect(screen.getByTestId('azkar-reminder-row-picker').props.value).toBe(chosen));
    fireEvent.press(screen.getByTestId('azkar-reminder-row-picker-done'));

    await waitFor(() => expect(lastSaved()).toMatchObject({ clockTime: '07:15' }));
    expect(screen.queryByTestId('azkar-reminder-row-picker')).toBeNull();
  });

  it('switches to a prayer trigger, starting at the prayer time with no offset', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder());
    await renderRow();

    fireEvent.press(screen.getByRole('tab', { name: 'بعد صلاة' }));

    expect(lastSaved()).toMatchObject({ triggerType: 'prayer_relative', offsetMinutes: 0 });
  });

  it('keeps the offset when a prayer is picked', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(
      reminder({ triggerType: 'prayer_relative', clockTime: null, prayer: 'maghrib', offsetMinutes: 15 }),
    );
    await renderRow();

    fireEvent.press(screen.getByRole('radio', { name: 'العصر' }));

    expect(lastSaved()).toMatchObject({ prayer: 'asr', offsetMinutes: 15 });
  });

  it('steps the offset in five-minute steps', async () => {
    jest.mocked(useAzkarReminder).mockReturnValue(
      reminder({ triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 0 }),
    );
    await renderRow();

    fireEvent.press(screen.getByRole('button', { name: 'زيادة الإزاحة' }));

    expect(lastSaved()).toMatchObject({ offsetMinutes: 5 });
  });

  it('shows the location notice when no location is known, and opens the Salah screen from it', async () => {
    jest.mocked(useHasReminderLocation).mockReturnValue(false);
    jest.mocked(useAzkarReminder).mockReturnValue(
      reminder({ triggerType: 'prayer_relative', clockTime: null, prayer: 'asr', offsetMinutes: 0 }),
    );
    await renderRow();

    expect(screen.getByText('حدّد موقعك في الصلاة لاستخدام هذا الخيار')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'تحديد الموقع' }));

    expect(router.push).toHaveBeenCalledWith('/salah');
  });

  it('uses the given title for the switch', async () => {
    await renderRow({ title: 'تذكير بهذا الذكر' });

    expect(screen.getByRole('switch', { name: 'تذكير بهذا الذكر' })).toBeOnTheScreen();
  });

  it.each(locales)('is labelled and drawn under %s', async (locale) => {
    jest.mocked(useAzkarReminder).mockReturnValue(reminder());
    await renderRow({}, locale);

    expect(screen.getByRole('switch', { name: locale === 'en' ? 'Daily alert' : 'تنبيه يومي' })).toBeOnTheScreen();
    expect(screen.getByTestId('azkar-reminder-row').props.value).toBe(true);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/azkar/components/AzkarReminderRow.tsx')).toEqual([]);
  });
});
