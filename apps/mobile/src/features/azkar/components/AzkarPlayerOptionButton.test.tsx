import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { AzkarPlayerOptionButton } from './AzkarPlayerOptionButton';

const REPEAT = { ios: 'repeat', android: 'repeat' } as const;

describe('AzkarPlayerOptionButton', () => {
  it('renders its label under its glyph and is a button with its own label', async () => {
    await renderUi(<AzkarPlayerOptionButton accessibilityLabel="التكرار: حسب العدد" icon={REPEAT} label="حسب العدد" onPress={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'التكرار: حسب العدد' });
    expect(button.props.accessibilityState).toEqual({ selected: false });
    expect(screen.getByText('حسب العدد')).toBeTruthy();
  });

  it('is selected when active, so the state is not colour alone', async () => {
    await renderUi(<AzkarPlayerOptionButton accessibilityLabel="السرعة ١×" active icon={REPEAT} label="١×" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'السرعة ١×' }).props.accessibilityState).toEqual({ selected: true });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarPlayerOptionButton accessibilityLabel="مؤقت النوم" icon={REPEAT} label="النوم" onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'مؤقت النوم' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes its glyph under the test id when one is given', async () => {
    await renderUi(<AzkarPlayerOptionButton accessibilityLabel="x" icon={REPEAT} label="x" onPress={jest.fn()} testID="opt" />);
    expect(screen.getByTestId('opt-icon', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps the same role and label in English', async () => {
    await renderUi(<AzkarPlayerOptionButton accessibilityLabel="Repeat: By count" icon={REPEAT} label="By count" onPress={jest.fn()} />, {
      locale: 'en',
    });
    expect(screen.getByRole('button', { name: 'Repeat: By count' })).toBeTruthy();
  });
});
