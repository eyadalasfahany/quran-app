import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { NextPrayerCard } from './NextPrayerCard';

const prayer = { kind: 'prayer' as const, name: 'العصر', remaining: 'بعد ساعتين و٥ دقائق', time: '٣:١٥ م' };

describe('NextPrayerCard', () => {
  it('shows the next prayer with its time and the time left', async () => {
    const view = await renderUi(<NextPrayerCard card={prayer} onPress={jest.fn()} />);

    expect(view.getByText('الصلاة القادمة')).toBeOnTheScreen();
    expect(view.getByTestId('home-next-prayer-name')).toHaveTextContent('العصر');
    expect(view.getByTestId('home-next-prayer-time')).toHaveTextContent('٣:١٥ م');
    expect(view.getByText('بعد ساعتين و٥ دقائق')).toBeOnTheScreen();
  });

  it('asks for a location, and shows no time, without one', async () => {
    const view = await renderUi(<NextPrayerCard card={{ kind: 'noLocation' }} onPress={jest.fn()} />);

    expect(view.getByTestId('home-next-prayer-prompt')).toHaveTextContent('حدّد موقعك لعرض مواقيت الصلاة');
    expect(view.queryByTestId('home-next-prayer-time')).toBeNull();
    expect(view.queryByTestId('home-next-prayer-name')).toBeNull();
  });

  it('opens on press, with the prayer in its accessible label', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<NextPrayerCard card={prayer} onPress={onPress} />);

    const card = view.getByRole('button', { name: 'الصلاة القادمة, العصر, ٣:١٥ م, بعد ساعتين و٥ دقائق' });
    expect(card.props.accessibilityHint).toBe('افتح أوقات الصلاة');
    await fireEvent.press(card);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('labels the prompt for a screen reader when there is no location', async () => {
    const view = await renderUi(<NextPrayerCard card={{ kind: 'noLocation' }} onPress={jest.fn()} />);

    expect(view.getByRole('button', { name: 'الصلاة القادمة, حدّد موقعك لعرض مواقيت الصلاة' })).toBeOnTheScreen();
  });

  it('reads in English', async () => {
    const view = await renderUi(
      <NextPrayerCard card={{ kind: 'prayer', name: 'Asr', remaining: 'in 2 hours 5 minutes', time: '3:15 PM' }} onPress={jest.fn()} />,
      { locale: 'en' },
    );

    expect(view.getByTestId('home-next-prayer-name')).toHaveTextContent('Asr');
    expect(view.getByText('in 2 hours 5 minutes')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/home/components/NextPrayerCard.tsx')).toEqual([]);
  });
});
