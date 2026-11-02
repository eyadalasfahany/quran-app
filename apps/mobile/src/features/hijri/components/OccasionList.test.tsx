import { renderUi } from '../../../../jest/render-ui';
import { groupOccasions } from '../data/grid';
import { upcomingOccasions } from '../data/occasions';

import { OccasionList } from './OccasionList';

const TODAY = new Date(2026, 9, 31, 12);

describe('OccasionList', () => {
  it('shows the section title over one row per occasion', async () => {
    const items = groupOccasions(upcomingOccasions(TODAY, 0, 6));
    const view = await renderUi(<OccasionList adjustDays={0} items={items} locale="ar" testID="list" today={TODAY} />);

    expect(view.getByRole('header', { name: 'المناسبات القادمة' })).toBeOnTheScreen();
    expect(view.getAllByTestId(/^list-row-\w+-\d+$/)).toHaveLength(items.length);
    expect(items.length).toBeGreaterThan(0);
  });

  it('shows the empty line when no occasion is listed', async () => {
    const view = await renderUi(<OccasionList adjustDays={0} items={[]} locale="ar" testID="list" today={TODAY} />);

    expect(view.getByTestId('list-empty')).toBeOnTheScreen();
    expect(view.getByText('لا توجد مناسبات قريبة.')).toBeOnTheScreen();
  });

  it('renders in English', async () => {
    const items = groupOccasions(upcomingOccasions(TODAY, 0, 3));
    const view = await renderUi(<OccasionList adjustDays={0} items={items} locale="en" testID="list" today={TODAY} />, {
      locale: 'en',
    });

    expect(view.getByRole('header', { name: 'Upcoming occasions' })).toBeOnTheScreen();
  });
});
