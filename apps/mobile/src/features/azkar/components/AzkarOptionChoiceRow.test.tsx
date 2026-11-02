import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarOptionChoiceRow } from './AzkarOptionChoiceRow';

describe('AzkarOptionChoiceRow', () => {
  it('is a radio with its checked state', async () => {
    await renderUi(<AzkarOptionChoiceRow checked label="مرة واحدة" onPress={jest.fn()} />);
    const row = screen.getByRole('radio', { name: 'مرة واحدة' });
    expect(row.props.accessibilityState).toEqual({ checked: true });
  });

  it('shows a check mark only on the chosen row', async () => {
    await renderUi(<AzkarOptionChoiceRow checked={false} label="مرة واحدة" onPress={jest.fn()} testID="row" />);
    expect(screen.queryByTestId('row-check')).toBeNull();

    await renderUi(<AzkarOptionChoiceRow checked label="مرة واحدة" onPress={jest.fn()} testID="chosen" />);
    expect(screen.getByTestId('chosen-check', { includeHiddenElements: true })).toBeTruthy();
  });

  it('calls onPress when chosen', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarOptionChoiceRow checked={false} label="تكرار متواصل" onPress={onPress} />);
    await press(screen.getByRole('radio', { name: 'تكرار متواصل' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('keeps a 44 pt target and the same role in English', async () => {
    await renderUi(<AzkarOptionChoiceRow checked={false} label="Once" onPress={jest.fn()} />, { locale: 'en' });
    const row = screen.getByRole('radio', { name: 'Once' });
    expect(row.props.style).toEqual(expect.objectContaining({ minHeight: 44 }));
  });
});
