import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SibhaTargetChip } from './SibhaTargetChip';

describe('SibhaTargetChip', () => {
  it('shows its label as a radio that is checked when selected', async () => {
    const view = await renderUi(<SibhaTargetChip label="١٠٠" onPress={jest.fn()} selected />);

    const chip = view.getByRole('radio', { name: '١٠٠' });
    expect(chip.props.accessibilityState).toEqual({ checked: true });
  });

  it('is unchecked when not selected', async () => {
    const view = await renderUi(<SibhaTargetChip label="٣٣" onPress={jest.fn()} selected={false} />);

    expect(view.getByRole('radio', { name: '٣٣' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(<SibhaTargetChip label="٩٩" onPress={onPress} selected={false} />);

    await fireEvent.press(view.getByRole('radio', { name: '٩٩' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders in English', async () => {
    const view = await renderUi(<SibhaTargetChip label="Custom" onPress={jest.fn()} selected />, { locale: 'en' });

    expect(view.getByRole('radio', { name: 'Custom' })).toBeOnTheScreen();
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaTargetChip.tsx')).toEqual([]);
  });
});
