import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { StageChips } from './StageChips';

const choices = ['childhood', 'adolescence', 'maturity', 'unspecified'] as const;

describe('StageChips', () => {
  it.each(locales)('shows a radio chip for each choice (%s)', async (locale) => {
    await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected="maturity" />, { locale });
    const names = locale === 'ar' ? ['الطفولة', 'الصبا', 'الكهولة', 'غير محدد'] : ['Childhood', 'Teens', 'Maturity', 'Not stated'];
    names.forEach((name) => expect(screen.getByRole('radio', { name })).toBeOnTheScreen());
  });

  it('marks the selected chip', async () => {
    await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected="maturity" />);
    expect(screen.getByRole('radio', { name: 'الكهولة' }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: 'الطفولة' }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it('reports the choice, including the unspecified bucket', async () => {
    const onSelect = jest.fn();
    await renderUi(<StageChips choices={choices} onSelect={onSelect} selected={null} />);
    await press(screen.getByRole('radio', { name: 'الصبا' }));
    expect(onSelect).toHaveBeenLastCalledWith('adolescence');
    await press(screen.getByRole('radio', { name: 'غير محدد' }));
    expect(onSelect).toHaveBeenLastCalledWith('unspecified');
  });

  it('draws «غير محدد» on a dashed edge, brand when selected', async () => {
    const idle = await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected={null} />);
    const idleChip = screen.getByTestId('seerah-stage-chips-unspecified');
    expect(flatStyle(idleChip.props.style)).toMatchObject({ borderStyle: 'dashed', minHeight: 36 });
    expect(Number(flatStyle(idleChip.props.style).minHeight) + 2 * Number(idleChip.props.hitSlop)).toBe(44);
    await idle.unmount();
    await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected="unspecified" />);
    expect(flatStyle(screen.getByTestId('seerah-stage-chips-unspecified').props.style).backgroundColor).toBe(themes.light.colors.brandSurface);
  });

  it('draws the frame chip: 14 pt text on the raised surface, the selected one filled in brand at weight 600', async () => {
    await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected="maturity" />);
    expect(flatStyle(screen.getByTestId('seerah-stage-chips-childhood').props.style)).toMatchObject({
      backgroundColor: themes.light.colors.surfaceRaised,
      borderRadius: 18,
    });
    expect(flatStyle(screen.getByTestId('seerah-stage-chips-maturity').props.style).backgroundColor).toBe(themes.light.colors.brandSurface);
    expect(flatStyle(screen.getByText('الكهولة').props.style)).toMatchObject({ color: themes.light.colors.onBrandSurface, fontSize: 14 });
  });

  it('labels the group «الفترات» and scrolls sideways', async () => {
    await renderUi(<StageChips choices={choices} onSelect={jest.fn()} selected={null} />);
    const list = screen.getByTestId('seerah-stage-chips');
    expect(list.props.accessibilityLabel).toBe('الفترات');
    expect(list.props.horizontal).toBe(true);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/StageChips.tsx')).toEqual([]);
  });
});
