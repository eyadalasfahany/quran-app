import { act, fireEvent, screen } from '@testing-library/react-native';

import { press } from '../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../jest/feature-ui-source';
import { renderUi } from '../../../jest/render-ui';

import { SearchBar } from './SearchBar';

const props = { backLabel: 'رجوع', placeholder: 'ابحث هنا', testID: 'bar' };

describe('SearchBar', () => {
  it('shows the placeholder as the field label and the back button with its label', async () => {
    await renderUi(<SearchBar {...props} onBack={jest.fn()} onChangeText={jest.fn()} onSubmit={jest.fn()} value="" />);

    expect(screen.getByLabelText('ابحث هنا')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
  });

  it('reports typing and submitting the query', async () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    const view = await renderUi(
      <SearchBar {...props} onBack={jest.fn()} onChangeText={onChangeText} onSubmit={onSubmit} value="الص" />,
    );

    await act(async () => fireEvent.changeText(view.getByTestId('bar-field-input'), 'الصباح'));
    expect(onChangeText).toHaveBeenCalledWith('الصباح');

    await act(async () => fireEvent(view.getByTestId('bar-field-input'), 'submitEditing'));
    expect(onSubmit).toHaveBeenCalledWith('الص');
  });

  it('goes back from its back button', async () => {
    const onBack = jest.fn();
    await renderUi(<SearchBar {...props} onBack={onBack} onChangeText={jest.fn()} onSubmit={jest.fn()} value="" />);

    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses the English labels the caller passes', async () => {
    await renderUi(
      <SearchBar backLabel="Back" onBack={jest.fn()} onChangeText={jest.fn()} onSubmit={jest.fn()} placeholder="Search duas" value="" />,
      { locale: 'en' },
    );
    expect(screen.getByLabelText('Search duas')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/shared/ui/SearchBar.tsx')).toEqual([]);
  });
});
