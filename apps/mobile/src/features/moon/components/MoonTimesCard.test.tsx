import { renderUi } from '../../../../jest/render-ui';

import { MoonTimesCard } from './MoonTimesCard';

const rows = [
  { key: 'conjunction', label: 'الاقتران (المحاق)', value: '٩ نوفمبر · ١٠:٠٢ ص' },
  { key: 'sunset', label: 'غروب الشمس', value: '٥:٤٠ م' },
  { key: 'moonset', label: 'غروب القمر', value: '٥:٣٤ م' },
  { key: 'moonsetCompared', label: 'غروب القمر مقارنةً بالشمس', value: 'قبلها بـ ٦ دقائق' },
  { key: 'nextConjunction', label: 'الاقتران التالي', value: '٩ ديسمبر · ٣:٥٢ ص' },
];

describe('MoonTimesCard', () => {
  it('lists the five time rows in the frame order in Arabic, with no card title', async () => {
    const view = await renderUi(<MoonTimesCard rows={rows} />);
    expect(view.getByTestId('moon-times-card-conjunction')).toBeOnTheScreen();
    expect(view.getByTestId('moon-times-card-nextConjunction')).toBeOnTheScreen();
    expect(view.getByText('قبلها بـ ٦ دقائق')).toBeOnTheScreen();
    expect(view.queryByText('الأوقات')).toBeNull();
  });

  it('lists the same rows in English', async () => {
    const view = await renderUi(
      <MoonTimesCard
        rows={[
          { key: 'sunset', label: 'Sunset', value: '5:40 PM' },
          { key: 'moonsetCompared', label: 'Moonset compared with sunset', value: '6 min before' },
        ]}
      />,
      { locale: 'en' },
    );
    expect(view.getByText('Moonset compared with sunset')).toBeOnTheScreen();
    expect(view.getByText('6 min before')).toBeOnTheScreen();
    expect(view.queryByText('Times')).toBeNull();
  });
});
