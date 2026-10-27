import { fireEvent } from '@testing-library/react-native';

import { featureComponentLiterals } from '../../../../jest/ui-source';
import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { SearchBar } from './SearchBar';

const noop = () => undefined;

describe('SearchBar', () => {
  it.each([
    ['ar', 'إلغاء', 'ابحث في القرآن'],
    ['en', 'Cancel', 'Search the Quran'],
  ] as const)('puts Cancel beside the field in %s', async (locale, cancel, placeholder) => {
    const view = await renderUi(<SearchBar onCancel={noop} onChangeText={noop} onSubmit={noop} value="" />, { locale });

    expect(view.getByRole('button', { name: cancel })).toBeOnTheScreen();
    expect(view.getByPlaceholderText(placeholder)).toBeOnTheScreen();
    expect(flatStyle(view.getByTestId('search-bar').props.style)).toMatchObject({ flexDirection: 'row' });
  });

  it('cancels, types and submits', async () => {
    const onCancel = jest.fn();
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    const view = await renderUi(
      <SearchBar onCancel={onCancel} onChangeText={onChangeText} onSubmit={onSubmit} value="الرحمن" />,
      { locale: 'en' },
    );

    await fireEvent.changeText(view.getByTestId('search-field-input'), 'الرحيم');
    await fireEvent(view.getByTestId('search-field-input'), 'submitEditing');
    await fireEvent.press(view.getByRole('button', { name: 'Cancel' }));

    expect(onChangeText).toHaveBeenCalledWith('الرحيم');
    expect(onSubmit).toHaveBeenCalledWith('الرحمن');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('keeps the field first in reading order in %s', async (locale) => {
    const view = await renderUi(<SearchBar onCancel={noop} onChangeText={noop} onSubmit={noop} value="" />, { locale });
    const [field] = view.getByTestId('search-bar').children;

    expect(typeof field === 'object' ? flatStyle(field.props.style).flex : undefined).toBe(1);
  });

  it('uses theme tokens only', () => {
    expect(featureComponentLiterals('features/search/components/SearchBar.tsx')).toEqual([]);
  });
});
