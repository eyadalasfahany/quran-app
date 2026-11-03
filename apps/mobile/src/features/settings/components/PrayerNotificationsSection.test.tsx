import { fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { storage, storageKeys } from '@/core/storage/mmkv';


import { PrayerNotificationsSection } from './PrayerNotificationsSection';
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false), replace: jest.fn() },
}));

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

describe('PrayerNotificationsSection', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('is headed «إشعارات الصلاة» and lists the five prayers, all off', async () => {
    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByRole('header', { name: 'إشعارات الصلاة' })).toBeOnTheScreen();
    for (const prayer of PRAYERS) {
      expect(view.getByTestId(`prayer-reminder-${prayer}`).props.value).toBe(false);
    }
    expect(view.queryByTestId('prayer-reminder-sunrise')).toBeNull();
  });

  it('mirrors the stored bells, so Settings and the الصلاة row agree', async () => {
    storage.set('salah.bell.dhuhr', true);

    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByTestId('prayer-reminder-dhuhr').props.value).toBe(true);
    expect(view.getByTestId('prayer-reminder-fajr').props.value).toBe(false);
  });

  it('lists the iqamah offset row between the prayer toggles and the adhan sound row', async () => {
    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByTestId('iqamah-offset-row')).toBeOnTheScreen();
    expect(view.getByText('تذكير الإقامة')).toBeOnTheScreen();
  });

  it('lists the adhan sound row after the five prayers, showing the chosen sound', async () => {
    storage.set(storageKeys.salah.prayerSound, 'makkah');

    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByText('صوت الأذان')).toBeOnTheScreen();
    expect(view.getByText('المسجد الحرام')).toBeOnTheScreen();
  });

  it('shows the default voice name when no sound is stored', async () => {
    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByText('الله أكبر')).toBeOnTheScreen();
  });

  it('opens the adhan sound picker from its row', async () => {
    const view = await renderUi(<PrayerNotificationsSection />);

    fireEvent.press(view.getByTestId('prayer-adhan-sound-row'));

    expect(router.push).toHaveBeenCalledWith('/adhan-sound');
  });

  it('offers a test iqamah button below the prayer notification group', async () => {
    const view = await renderUi(<PrayerNotificationsSection />);

    expect(view.getByRole('button', { name: 'إرسال إشعار إقامة تجريبي' })).toBeOnTheScreen();
  });

  it.each(locales)('is headed in %s', async (locale) => {
    const view = await renderUi(<PrayerNotificationsSection />, { locale });

    const expected = locale === 'en' ? 'Prayer notifications' : 'إشعارات الصلاة';
    expect(view.getByRole('header', { name: expected })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/PrayerNotificationsSection.tsx')).toEqual([]);
  });
});
