import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { MyQuranTabs } from './MyQuranTabs';

describe('MyQuranTabs', () => {
  it.each(locales)('renders the four sections (%s)', async (locale) => {
    const view = await renderUi(<MyQuranTabs onChange={jest.fn()} value="bookmarks" />, { locale });

    const labels = { ar: ['العلامات', 'التظليلات', 'الملاحظات', 'الختمة'], en: ['Bookmarks', 'Highlights', 'Notes', 'Khatma'] }[
      locale
    ];
    for (const label of labels) {
      expect(view.getByRole('tab', { name: label })).toBeOnTheScreen();
    }
  });

  it('selects a section on press', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MyQuranTabs onChange={onChange} value="bookmarks" />);

    fireEvent.press(view.getByRole('tab', { name: 'التظليلات' }));

    expect(onChange).toHaveBeenCalledWith('highlights');
  });

  it('selects the khatma tab on press', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<MyQuranTabs onChange={onChange} value="bookmarks" />);

    fireEvent.press(view.getByRole('tab', { name: 'الختمة' }));

    expect(onChange).toHaveBeenCalledWith('khatma');
  });
});
