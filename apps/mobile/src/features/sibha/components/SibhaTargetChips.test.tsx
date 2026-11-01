import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { renderUi } from '../../../../jest/render-ui';
import { SibhaTargetChips } from './SibhaTargetChips';

describe('SibhaTargetChips', () => {
  it('offers 33, 99, 100 and a custom chip, in that order', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={100} />);

    const labels = view.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel);
    expect(labels).toEqual(['٣٣', '٩٩', '١٠٠', 'مخصص']);
    expect(view.getByLabelText('الهدف').props.accessibilityRole).toBe('radiogroup');
  });

  it('checks the chip of the current preset target', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={33} />);

    expect(view.getByRole('radio', { name: '٣٣' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: '١٠٠' }).props.accessibilityState).toEqual({ checked: false });
    expect(view.getByRole('radio', { name: 'مخصص' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('checks the custom chip for a target that is not a preset', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={250} />);

    expect(view.getByRole('radio', { name: 'مخصص' }).props.accessibilityState).toEqual({ checked: true });
  });

  it('checks no chip without a target', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={null} />);

    for (const chip of view.getAllByRole('radio')) {
      expect(chip.props.accessibilityState).toEqual({ checked: false });
    }
  });

  it('reports the preset pressed, or custom for the custom chip', async () => {
    const onChoose = jest.fn();
    const view = await renderUi(<SibhaTargetChips onChoose={onChoose} target={100} />);

    await fireEvent.press(view.getByRole('radio', { name: '٩٩' }));
    await fireEvent.press(view.getByRole('radio', { name: 'مخصص' }));

    expect(onChoose).toHaveBeenNthCalledWith(1, 99);
    expect(onChoose).toHaveBeenNthCalledWith(2, 'custom');
  });

  it('uses Western digits in English', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={null} />, { locale: 'en' });

    expect(view.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual(['33', '99', '100', 'Custom']);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaTargetChips.tsx')).toEqual([]);
  });
});
