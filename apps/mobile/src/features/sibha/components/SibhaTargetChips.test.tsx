import { fireEvent } from '@testing-library/react-native';

import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { flatStyle, renderUi } from '../../../../jest/render-ui';
import { SibhaTargetChips } from './SibhaTargetChips';

describe('SibhaTargetChips', () => {
  it('offers 33, 99, 100, a custom chip and no limit, in that order', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={100} />);

    const labels = view.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel);
    expect(labels).toEqual(['٣٣', '٩٩', '١٠٠', 'مخصص', 'بلا حد']);
    expect(view.getByLabelText('الهدف').props.accessibilityRole).toBe('radiogroup');
  });

  it('checks the chip of the current preset target', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={33} />);

    expect(view.getByRole('radio', { name: '٣٣' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: '١٠٠' }).props.accessibilityState).toEqual({ checked: false });
    expect(view.getByRole('radio', { name: 'مخصص' }).props.accessibilityState).toEqual({ checked: false });
    expect(view.getByRole('radio', { name: 'بلا حد' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('checks the custom chip for a target that is not a preset', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={250} />);

    expect(view.getByRole('radio', { name: 'مخصص' }).props.accessibilityState).toEqual({ checked: true });
    expect(view.getByRole('radio', { name: 'بلا حد' }).props.accessibilityState).toEqual({ checked: false });
  });

  it('checks only the no-limit chip without a target', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={null} />);

    expect(view.getByRole('radio', { name: 'بلا حد' }).props.accessibilityState).toEqual({ checked: true });
    for (const chip of view.getAllByRole('radio').filter((radio) => radio.props.accessibilityLabel !== 'بلا حد')) {
      expect(chip.props.accessibilityState).toEqual({ checked: false });
    }
  });

  it('reports the preset pressed, custom for the custom chip, and none for no limit', async () => {
    const onChoose = jest.fn();
    const view = await renderUi(<SibhaTargetChips onChoose={onChoose} target={100} />);

    await fireEvent.press(view.getByRole('radio', { name: '٩٩' }));
    await fireEvent.press(view.getByRole('radio', { name: 'مخصص' }));
    await fireEvent.press(view.getByRole('radio', { name: 'بلا حد' }));

    expect(onChoose).toHaveBeenNthCalledWith(1, 99);
    expect(onChoose).toHaveBeenNthCalledWith(2, 'custom');
    expect(onChoose).toHaveBeenNthCalledWith(3, 'none');
  });

  it('gives the no-limit chip a 44 pt hit area, like the others', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={null} />);

    expect(flatStyle(view.getByRole('radio', { name: 'بلا حد' }).props.style).minHeight).toBe(44);
  });

  it('uses Western digits and English labels in English', async () => {
    const view = await renderUi(<SibhaTargetChips onChoose={jest.fn()} target={null} />, { locale: 'en' });

    expect(view.getAllByRole('radio').map((chip) => chip.props.accessibilityLabel)).toEqual([
      '33',
      '99',
      '100',
      'Custom',
      'No limit',
    ]);
  });

  it('uses theme tokens rather than raw colours', () => {
    expect(rawColorLiteralsInFeature('src/features/sibha/components/SibhaTargetChips.tsx')).toEqual([]);
  });
});
