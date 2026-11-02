import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { themes } from '@/core/theme';

import { HijriDayCell } from './HijriDayCell';

const colors = themes.light.colors;

describe('HijriDayCell', () => {
  it('renders the Hijri day large and the Gregorian day small, labelled as one day', async () => {
    const view = await renderUi(
      <HijriDayCell gregorian="٣١" hijri="٢٠" label="٢٠ جمادى الأولى ١٤٤٨، يوافق ٣١ أكتوبر" testID="cell" />,
    );

    expect(view.getByText('٢٠')).toBeOnTheScreen();
    expect(view.getByText('٣١')).toBeOnTheScreen();
    expect(view.getByLabelText('٢٠ جمادى الأولى ١٤٤٨، يوافق ٣١ أكتوبر')).toBeOnTheScreen();
  });

  it('fills today with brand and marks it selected', async () => {
    const view = await renderUi(<HijriDayCell gregorian="٢" hijri="٢٢" isToday label="today" testID="cell" />);
    const cell = view.getByTestId('cell');

    expect(flatStyle(cell.props.style).backgroundColor).toBe(colors.brand);
    expect(cell.props.accessibilityState).toEqual({ selected: true });
  });

  it('draws a gold marker only for an occasion day', async () => {
    const marked = await renderUi(<HijriDayCell gregorian="٨" hijri="١" isMarked label="occasion" testID="cell" />);
    expect(marked.getByTestId('cell-marker')).toBeOnTheScreen();
    expect(flatStyle(marked.getByTestId('cell-marker').props.style).backgroundColor).toBe(colors.gold);

    const plain = await renderUi(<HijriDayCell gregorian="٩" hijri="٢" label="plain" testID="cell" />);
    expect(plain.queryByTestId('cell-marker')).toBeNull();
  });

  it('keeps the neighbour days in the same cell shape, not hidden', async () => {
    const view = await renderUi(<HijriDayCell gregorian="٣٠" hijri="١١" inMonth={false} label="neighbour" testID="cell" />);

    expect(view.getByLabelText('neighbour')).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('cell').props.style).backgroundColor).toBe('transparent');
  });

  it('renders in English with the same structure', async () => {
    const view = await renderUi(<HijriDayCell gregorian="31" hijri="20" label="English day" testID="cell" />, { locale: 'en' });

    expect(view.getByRole('text', { name: 'English day' })).toBeOnTheScreen();
  });
});
