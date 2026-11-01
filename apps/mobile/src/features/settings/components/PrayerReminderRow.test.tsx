import * as Notifications from 'expo-notifications';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { PrayerReminderRow } from './PrayerReminderRow';

describe('PrayerReminderRow', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openSettings').mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders off by default, labelled as the prayer reminder', async () => {
    const view = await renderUi(<PrayerReminderRow prayer="fajr" />);

    expect(view.getByTestId('prayer-reminder-fajr').props.value).toBe(false);
    expect(view.getByRole('switch', { name: 'تنبيه الفجر' })).toBeOnTheScreen();
  });

  it('shows the stored bell as on', async () => {
    storage.set(storageKeys.salah.bellIsha, true);

    const view = await renderUi(<PrayerReminderRow prayer="isha" />);

    expect(view.getByTestId('prayer-reminder-isha').props.value).toBe(true);
  });

  it('turning on with permission stores the bell and schedules it', async () => {
    const view = await renderUi(<PrayerReminderRow prayer="dhuhr" />);

    fireEvent(view.getByTestId('prayer-reminder-dhuhr'), 'valueChange', true);

    await waitFor(() => expect(storage.getBoolean(storageKeys.salah.bellDhuhr)).toBe(true));
    await waitFor(() => expect(view.getByTestId('prayer-reminder-dhuhr').props.value).toBe(true));
  });

  it('keeps the switch off and shows the permission dialog when permission is denied', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const view = await renderUi(<PrayerReminderRow prayer="asr" />);

    fireEvent(view.getByTestId('prayer-reminder-asr'), 'valueChange', true);

    await waitFor(() => expect(view.getByText('لا يمكن إرسال التذكيرات')).toBeOnTheScreen());
    expect(storage.getBoolean(storageKeys.salah.bellAsr)).toBeUndefined();
    expect(view.getByTestId('prayer-reminder-asr').props.value).toBe(false);
  });

  it('opens the Settings app from the permission dialog', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValueOnce({ granted: false } as never);
    const view = await renderUi(<PrayerReminderRow prayer="isha" />);

    fireEvent(view.getByTestId('prayer-reminder-isha'), 'valueChange', true);
    await waitFor(() => expect(view.getByRole('button', { name: 'فتح الإعدادات' })).toBeOnTheScreen());

    fireEvent.press(view.getByRole('button', { name: 'فتح الإعدادات' }));

    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('does not show the permission dialog when permission is granted', async () => {
    const view = await renderUi(<PrayerReminderRow prayer="fajr" />);

    fireEvent(view.getByTestId('prayer-reminder-fajr'), 'valueChange', true);

    await waitFor(() => expect(storage.getBoolean(storageKeys.salah.bellFajr)).toBe(true));
    expect(view.queryByText('لا يمكن إرسال التذكيرات')).toBeNull();
  });

  it('turning off clears the stored bell without asking for permission', async () => {
    storage.set(storageKeys.salah.bellMaghrib, true);
    const view = await renderUi(<PrayerReminderRow prayer="maghrib" />);

    fireEvent(view.getByTestId('prayer-reminder-maghrib'), 'valueChange', false);

    await waitFor(() => expect(storage.getBoolean(storageKeys.salah.bellMaghrib)).toBe(false));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('exposes the switch with its role and label in English', async () => {
    const view = await renderUi(<PrayerReminderRow prayer="maghrib" />, { locale: 'en' });

    expect(view.getByRole('switch', { name: 'Maghrib reminder' })).toBeOnTheScreen();
  });

  it.each(locales)('renders under %s', async (locale) => {
    const view = await renderUi(<PrayerReminderRow prayer="fajr" />, { locale });

    const expected = locale === 'en' ? 'Fajr reminder' : 'تنبيه الفجر';
    expect(view.getByRole('switch', { name: expected })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/PrayerReminderRow.tsx')).toEqual([]);
  });
});
