import { renderUi } from '../../../../jest/render-ui';

import { HijriWeekdayRow } from './HijriWeekdayRow';

// The row is hidden from assistive technology (each day has its own label), so its letters are queried with the option.
const hidden = { includeHiddenElements: true };

describe('HijriWeekdayRow', () => {
  it('shows seven letters, Saturday first in Arabic', async () => {
    const view = await renderUi(<HijriWeekdayRow locale="ar" testID="row" />);

    expect(view.getByTestId('row-0', hidden)).toHaveTextContent('س');
    expect(view.getByTestId('row-1', hidden)).toHaveTextContent('ح');
    // Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday: the seventh letter is Friday (ج), as in the frame.
    expect(view.getByTestId('row-6', hidden)).toHaveTextContent('ج');
  });

  it('shows Sunday first in English', async () => {
    const view = await renderUi(<HijriWeekdayRow locale="en" testID="row" />, { locale: 'en' });

    expect(view.getByTestId('row-0', hidden)).toHaveTextContent('S');
    expect(view.getByTestId('row-1', hidden)).toHaveTextContent('M');
  });

  it('is hidden from assistive technology, since each day carries its own label', async () => {
    const view = await renderUi(<HijriWeekdayRow locale="ar" testID="row" />);

    expect(view.getByTestId('row', hidden).props.accessibilityElementsHidden).toBe(true);
    expect(view.queryByTestId('row')).toBeNull();
  });
});
