import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarOptionChoices } from './AzkarOptionChoices';

const choices = [
  { value: 'count', label: 'حسب العدد' },
  { value: 'once', label: 'مرة واحدة' },
  { value: 'continuous', label: 'تكرار متواصل' },
];

describe('AzkarOptionChoices', () => {
  it('lists every choice under its title, as a radio group', async () => {
    await renderUi(<AzkarOptionChoices choices={choices} onSelect={jest.fn()} selected="count" title="التكرار" />);
    expect(screen.getByRole('header', { name: 'التكرار' })).toBeTruthy();
    expect(screen.getByLabelText('التكرار').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('marks only the selected choice', async () => {
    await renderUi(<AzkarOptionChoices choices={choices} onSelect={jest.fn()} selected="once" title="التكرار" />);
    expect(screen.getByRole('radio', { name: 'مرة واحدة' }).props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByRole('radio', { name: 'حسب العدد' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('reports the value of the choice that was pressed', async () => {
    const onSelect = jest.fn();
    await renderUi(<AzkarOptionChoices choices={choices} onSelect={onSelect} selected="count" title="التكرار" />);
    await press(screen.getByRole('radio', { name: 'تكرار متواصل' }));
    expect(onSelect).toHaveBeenCalledWith('continuous');
  });

  it('renders in English', async () => {
    await renderUi(
      <AzkarOptionChoices choices={[{ value: 'once', label: 'Once' }]} onSelect={jest.fn()} selected="once" title="Repeat" />,
      { locale: 'en' },
    );
    expect(screen.getByRole('radio', { name: 'Once' })).toBeTruthy();
  });
});
