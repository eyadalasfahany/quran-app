import { Text } from 'react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { PrayerTimesCard } from './PrayerTimesCard';

describe('PrayerTimesCard', () => {
  it('renders its rows clipped inside the raised card', async () => {
    const view = await renderUi(
      <PrayerTimesCard>
        <Text>row one</Text>
        <Text>row two</Text>
      </PrayerTimesCard>,
    );

    expect(view.getByText('row one')).toBeTruthy();
    expect(view.getByText('row two')).toBeTruthy();

    const style = flatStyle(view.getByTestId('salah-times').props.style);
    expect(style.backgroundColor).toBe(themes.light.colors.surfaceRaised);
    expect(style.borderRadius).toBe(themes.light.radius.lg);
    expect(style.overflow).toBe('hidden');
  });
});
