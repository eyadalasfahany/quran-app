import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';

import { SuggestSheetHeader } from './SuggestSheetHeader';

describe('SuggestSheetHeader', () => {
  it.each(locales)('shows the title as a header and a labelled close button in %s', async (locale) => {
    const view = await renderUi(<SuggestSheetHeader closeLabel="إغلاق" onClose={jest.fn()} title="اقترح فكرة" />, { locale });

    expect(view.getByRole('header', { name: 'اقترح فكرة' })).toBeOnTheScreen();
    expect(view.getByRole('button', { name: 'إغلاق' })).toBeOnTheScreen();
  });

  it('calls onClose when the close button is pressed', async () => {
    const onClose = jest.fn();
    const view = await renderUi(<SuggestSheetHeader closeLabel="إغلاق" onClose={onClose} title="اقترح فكرة" />);

    fireEvent.press(view.getByRole('button', { name: 'إغلاق' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
