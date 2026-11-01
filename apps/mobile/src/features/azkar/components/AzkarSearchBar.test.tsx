import { act, fireEvent, screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarSearchBar } from './AzkarSearchBar';

describe('AzkarSearchBar', () => {
  it('shows the placeholder as the field label and the back button', async () => {
    await renderUi(<AzkarSearchBar onBack={jest.fn()} onChangeText={jest.fn()} onSubmit={jest.fn()} value="" />);

    expect(screen.getByLabelText('ابحث في الأذكار')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'رجوع' })).toBeOnTheScreen();
  });

  it('reports typing and submitting the query', async () => {
    const onChangeText = jest.fn();
    const onSubmit = jest.fn();
    const view = await renderUi(
      <AzkarSearchBar onBack={jest.fn()} onChangeText={onChangeText} onSubmit={onSubmit} value="الص" />,
    );

    await act(async () => fireEvent.changeText(view.getByTestId('azkar-search-bar-field-input'), 'الصباح'));
    expect(onChangeText).toHaveBeenCalledWith('الصباح');

    await act(async () => fireEvent(view.getByTestId('azkar-search-bar-field-input'), 'submitEditing'));
    expect(onSubmit).toHaveBeenCalledWith('الص');
  });

  it('goes back from its back button', async () => {
    const onBack = jest.fn();
    await renderUi(<AzkarSearchBar onBack={onBack} onChangeText={jest.fn()} onSubmit={jest.fn()} value="" />);

    await press(screen.getByRole('button', { name: 'رجوع' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the English placeholder', async () => {
    await renderUi(<AzkarSearchBar onBack={jest.fn()} onChangeText={jest.fn()} onSubmit={jest.fn()} value="" />, { locale: 'en' });
    expect(screen.getByLabelText('Search azkar')).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarSearchBar.tsx')).toEqual([]);
  });
});
