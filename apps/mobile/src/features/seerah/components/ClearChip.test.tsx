import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';

import { ClearChip } from './ClearChip';

describe('ClearChip', () => {
  it.each(locales)('renders as a button with its label (%s)', async (locale) => {
    await renderUi(<ClearChip label="الكل" onPress={jest.fn()} />, { locale });
    expect(screen.getByRole('button', { name: 'الكل' })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<ClearChip label="الكل" onPress={onPress} />);
    await press(screen.getByRole('button', { name: 'الكل' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('passes the hint to screen readers', async () => {
    await renderUi(<ClearChip hint="Shows every age" label="الكل" onPress={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'الكل' }).props.accessibilityHint).toBe('Shows every age');
  });

  it('is a 36 pt pill that reaches a 44 pt target with its hit slop', async () => {
    await renderUi(<ClearChip label="الكل" onPress={jest.fn()} testID="clear" />);
    const chip = screen.getByTestId('clear');
    expect(flatStyle(chip.props.style).minHeight).toBe(36);
    expect(Number(flatStyle(chip.props.style).minHeight) + 2 * Number(chip.props.hitSlop)).toBe(44);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/ClearChip.tsx')).toEqual([]);
  });
});
