import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { BookmarkKindTabs } from './BookmarkKindTabs';

describe('BookmarkKindTabs', () => {
  it.each(locales)('renders the Quran and Hadith kinds as radio options (%s)', async (locale) => {
    const view = await renderUi(<BookmarkKindTabs onChange={jest.fn()} value="quran" />, { locale });

    const labels = { ar: ['القرآن', 'الحديث'], en: ['Quran', 'Hadith'] }[locale];
    for (const label of labels) {
      expect(view.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
  });

  it('marks the selected kind', async () => {
    const view = await renderUi(<BookmarkKindTabs onChange={jest.fn()} value="hadith" />);

    expect(view.getByRole('radio', { name: 'الحديث' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'القرآن' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('selects the hadith kind on press', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<BookmarkKindTabs onChange={onChange} value="quran" />);

    fireEvent.press(view.getByRole('radio', { name: 'الحديث' }));

    expect(onChange).toHaveBeenCalledWith('hadith');
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/my-quran/components/BookmarkKindTabs.tsx')).toEqual([]);
  });
});
