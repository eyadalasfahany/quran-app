import { renderUi } from '../../../../jest/render-ui';
import { groupOccasions, type OccasionItem } from '../data/grid';
import { upcomingOccasions } from '../data/occasions';

import { OccasionRow } from './OccasionRow';

function itemFor(id: string, from: Date): OccasionItem {
  const found = groupOccasions(upcomingOccasions(from, 0, 40)).find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`no ${id} from ${from.toDateString()}`);
  }
  return found;
}

const ramadan = itemFor('ramadan1', new Date(2027, 0, 1, 12));
const white = itemFor('whiteDays', new Date(2026, 9, 1, 12));

describe('OccasionRow', () => {
  it('renders the name, the dates and the days-away chip', async () => {
    const view = await renderUi(<OccasionRow adjustDays={0} daysAway={38} item={ramadan} locale="ar" testID="row" />);

    expect(view.getByText('بداية شهر رمضان')).toBeOnTheScreen();
    expect(view.getByText('بعد ٣٨ يومًا')).toBeOnTheScreen();
    expect(view.getByTestId('row-dot')).toBeOnTheScreen();
  });

  it('uses the singular and zero forms of the days-away line', async () => {
    const today = await renderUi(<OccasionRow adjustDays={0} daysAway={0} item={ramadan} locale="ar" testID="row" />);
    expect(today.getByText('اليوم')).toBeOnTheScreen();

    const one = await renderUi(<OccasionRow adjustDays={0} daysAway={1} item={ramadan} locale="ar" testID="row" />);
    expect(one.getByText('بعد يوم')).toBeOnTheScreen();

    const two = await renderUi(<OccasionRow adjustDays={0} daysAway={2} item={ramadan} locale="ar" testID="row" />);
    expect(two.getByText('بعد يومين')).toBeOnTheScreen();
  });

  it('groups the white days under one name with a range', async () => {
    const view = await renderUi(<OccasionRow adjustDays={0} daysAway={21} item={white} locale="ar" testID="row" />);

    expect(view.getByText('الأيام البيض')).toBeOnTheScreen();
    expect(view.getByText(/^١٣–١٥ /)).toBeOnTheScreen();
  });

  it('is one labelled text element for a screen reader', async () => {
    const view = await renderUi(<OccasionRow adjustDays={0} daysAway={38} item={ramadan} locale="ar" testID="row" />);

    expect(view.getByLabelText(/بداية شهر رمضان, .*, بعد ٣٨ يومًا/)).toBeOnTheScreen();
  });

  it('renders in English', async () => {
    const view = await renderUi(<OccasionRow adjustDays={0} daysAway={3} item={ramadan} locale="en" testID="row" />, {
      locale: 'en',
    });

    expect(view.getByText('Start of Ramadan')).toBeOnTheScreen();
    expect(view.getByText('In 3 days')).toBeOnTheScreen();
  });
});
