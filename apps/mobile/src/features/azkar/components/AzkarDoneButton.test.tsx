import { screen } from '@testing-library/react-native';

import { renderUi } from '../../../../jest/render-ui';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { AzkarDoneButton } from './AzkarDoneButton';

describe('AzkarDoneButton', () => {
  it('renders the done action as a button, never as a count', async () => {
    await renderUi(<AzkarDoneButton completed={false} onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'تم' })).toBeTruthy();
    expect(screen.queryByText(/من/)).toBeNull();
  });

  it('calls onPress once when not yet done', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarDoneButton completed={false} onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'تم' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is disabled once done, so a finished unit stays in place', async () => {
    const onPress = jest.fn();
    await renderUi(<AzkarDoneButton completed onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'تم' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
    await press(screen.getByRole('button', { name: 'تم' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders the English label', async () => {
    await renderUi(<AzkarDoneButton completed={false} onPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/azkar/components/AzkarDoneButton.tsx')).toEqual([]);
  });
});
