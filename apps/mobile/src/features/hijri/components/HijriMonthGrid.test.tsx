import { renderUi } from '../../../../jest/render-ui';
import { monthCells } from '../data/grid';
import { hijriMonth } from '../data/month';

import { HijriMonthGrid, dayKey } from './HijriMonthGrid';

// Ramadan 1448 starts on Monday 8 February 2027, so the Arabic grid opens with the Saturday before it.
const ramadan = hijriMonth(1448, 9, 0)!;
const cells = monthCells(ramadan, 0, 'ar');
const TODAY = dayKey(new Date(2027, 1, 10, 12));

describe('HijriMonthGrid', () => {
  it('renders a whole number of 7-day rows with the neighbour days', async () => {
    const view = await renderUi(
      <HijriMonthGrid adjustDays={0} cells={cells} locale="ar" testID="grid" todayKey={TODAY} />,
    );

    expect(cells.length % 7).toBe(0);
    expect(view.getByTestId('grid')).toBeOnTheScreen();
    expect(view.getByTestId('grid-day-2027-2-8-in')).toBeOnTheScreen();
    expect(view.getByTestId('grid-day-2027-2-6-out')).toBeOnTheScreen();
  });

  it('labels the first day of Ramadan with its occasion', async () => {
    const view = await renderUi(
      <HijriMonthGrid adjustDays={0} cells={cells} locale="ar" testID="grid" todayKey="none" />,
    );

    expect(view.getByLabelText(/بداية شهر رمضان/)).toBeOnTheScreen();
  });

  it('labels today and selects it', async () => {
    const view = await renderUi(
      <HijriMonthGrid adjustDays={0} cells={cells} locale="ar" testID="grid" todayKey={TODAY} />,
    );

    expect(view.getByLabelText(/^اليوم، /)).toBeOnTheScreen();
  });

  it('becomes a day list at large text: one row per day of the month, no neighbour days', async () => {
    const view = await renderUi(
      <HijriMonthGrid adjustDays={0} cells={cells} largeText locale="ar" testID="grid" todayKey={TODAY} />,
    );

    expect(view.queryByTestId('grid-day-2027-2-6-out')).toBeNull();
    expect(view.getByTestId('grid-day-2027-2-8')).toBeOnTheScreen();
    expect(view.getAllByRole('text').length).toBeGreaterThanOrEqual(ramadan.length);
  });

  it('renders in English with Sunday first', async () => {
    const enCells = monthCells(ramadan, 0, 'en');
    const view = await renderUi(
      <HijriMonthGrid adjustDays={0} cells={enCells} locale="en" testID="grid" todayKey={TODAY} />,
      { locale: 'en' },
    );

    expect(view.getByLabelText(/Start of Ramadan/)).toBeOnTheScreen();
  });
});
