import { fireEvent } from '@testing-library/react-native';

import { locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { SearchScopeChips } from './SearchScopeChips';

const ALL = ['quran', 'hadith', 'azkar'] as const;

describe('SearchScopeChips', () => {
  it('renders only the given scopes, as radio options, in order', async () => {
    const view = await renderUi(<SearchScopeChips onChange={jest.fn()} scopes={['quran', 'azkar']} value="quran" />);

    expect(view.getByRole('radio', { name: 'القرآن' })).toBeOnTheScreen();
    expect(view.getByRole('radio', { name: 'الأذكار' })).toBeOnTheScreen();
    expect(view.queryByRole('radio', { name: 'الحديث' })).toBeNull();
    expect(view.queryByTestId('search-scope-hadith')).toBeNull();
    const ids = view.getAllByRole('radio').map((node) => node.props.testID);
    expect(ids).toEqual(['search-scope-quran', 'search-scope-azkar']);
  });

  it('renders all three scopes in the order quran, hadith, azkar', async () => {
    const view = await renderUi(<SearchScopeChips onChange={jest.fn()} scopes={ALL} value="hadith" />);

    const ids = view.getAllByRole('radio').map((node) => node.props.testID);
    expect(ids).toEqual(['search-scope-quran', 'search-scope-hadith', 'search-scope-azkar']);
  });

  it('marks only the selected scope as checked', async () => {
    const view = await renderUi(<SearchScopeChips onChange={jest.fn()} scopes={ALL} value="hadith" />);

    expect(view.getByRole('radio', { name: 'الحديث' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(view.getByRole('radio', { name: 'القرآن' }).props.accessibilityState).toMatchObject({ checked: false });
    expect(view.getByRole('radio', { name: 'الأذكار' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('calls onChange with the pressed scope', async () => {
    const onChange = jest.fn();
    const view = await renderUi(<SearchScopeChips onChange={onChange} scopes={ALL} value="quran" />);

    fireEvent.press(view.getByRole('radio', { name: 'الأذكار' }));

    expect(onChange).toHaveBeenCalledWith('azkar');
  });

  it('has an accessible group label', async () => {
    const view = await renderUi(<SearchScopeChips onChange={jest.fn()} scopes={ALL} value="quran" />);

    expect(view.getByLabelText('نطاق البحث')).toBeOnTheScreen();
  });

  it.each(locales)('labels the scopes in %s', async (locale) => {
    const view = await renderUi(<SearchScopeChips onChange={jest.fn()} scopes={ALL} value="quran" />, { locale });

    const labels = { ar: ['القرآن', 'الحديث', 'الأذكار'], en: ['Quran', 'Hadith', 'Azkar'] }[locale];
    for (const label of labels) {
      expect(view.getByRole('radio', { name: label })).toBeOnTheScreen();
    }
    expect(view.getByLabelText({ ar: 'نطاق البحث', en: 'Search in' }[locale])).toBeOnTheScreen();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/search/components/SearchScopeChips.tsx')).toEqual([]);
  });
});
