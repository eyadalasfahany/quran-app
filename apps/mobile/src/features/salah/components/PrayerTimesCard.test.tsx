import { Text } from 'react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { PrayerTimesCard } from './PrayerTimesCard';

describe('PrayerTimesCard', () => {
  it.each(locales)('shows the section title and wraps children (%s)', async (locale) => {
    const view = await renderUi(
      <PrayerTimesCard>
        <Text>row</Text>
      </PrayerTimesCard>,
      { locale },
    );

    expect(view.getByText(locale === 'ar' ? 'مواقيت اليوم' : "Today's times")).toBeTruthy();
    expect(view.getByTestId('salah-times-card')).toBeTruthy();
    expect(view.getByText('row')).toBeTruthy();
  });
});
