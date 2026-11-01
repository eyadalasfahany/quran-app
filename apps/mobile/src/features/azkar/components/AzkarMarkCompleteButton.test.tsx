import { screen } from '@testing-library/react-native';

import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { AzkarMarkCompleteButton } from './AzkarMarkCompleteButton';

describe('AzkarMarkCompleteButton', () => {
  it('renders the «إتمام» action as a button', async () => {
    await renderUi(<AzkarMarkCompleteButton onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'إتمام' })).toBeTruthy();
  });

  it('calls onPress once when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarMarkCompleteButton onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'إتمام' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders the English label «Mark as complete»', async () => {
    await renderUi(<AzkarMarkCompleteButton onPress={jest.fn()} />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Mark as complete' })).toBeTruthy();
  });

  it('uses no raw colour literals', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarMarkCompleteButton.tsx')).toEqual([]);
  });
});
