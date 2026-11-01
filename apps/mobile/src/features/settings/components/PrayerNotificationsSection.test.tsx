import { locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { storage } from '@/core/storage/mmkv';

import { PrayerNotificationsSection } from './PrayerNotificationsSection';

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

  it.each(locales)('is headed in %s', async (locale) => {
    const view = await renderUi(<PrayerNotificationsSection />, { locale });

    const expected = locale === 'en' ? 'Prayer notifications' : 'إشعارات الصلاة';
    expect(view.getByRole('header', { name: expected })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/settings/components/PrayerNotificationsSection.tsx')).toEqual([]);
  });
});
