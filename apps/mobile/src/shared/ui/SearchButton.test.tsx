import { fireEvent } from '@testing-library/react-native';

import { renderUi } from '../../../jest/render-ui';
import { rawColorLiterals } from '../../../jest/ui-source';

import { SearchButton } from './SearchButton';

describe('SearchButton', () => {
  it('renders a labelled button in the raised header style', async () => {
    const view = await renderUi(<SearchButton onPress={jest.fn()} testID="search" />);

    expect(view.getByRole('button', { name: 'بحث' })).toBeOnTheScreen();
    expect(view.getByTestId('search')).toBeOnTheScreen();
    expect(view.getByTestId('search-icon', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SearchButton onPress={onPress} testID="search" />);
    await fireEvent.press(view.getByRole('button', { name: 'بحث' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is labelled «بحث» under Arabic', async () => {
    const view = await renderUi(<SearchButton onPress={jest.fn()} />, { locale: 'ar' });

    expect(view.getByRole('button', { name: 'بحث' })).toBeOnTheScreen();
  });

  it('is labelled "Search" under English', async () => {
    const view = await renderUi(<SearchButton onPress={jest.fn()} />, { locale: 'en' });

    expect(view.getByRole('button', { name: 'Search' })).toBeOnTheScreen();
  });

  it('has no raw colour literals', () => {
    expect(rawColorLiterals('SearchButton.tsx')).toEqual([]);
  });
});
