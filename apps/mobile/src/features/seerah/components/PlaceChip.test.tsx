import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { PlaceChip } from './PlaceChip';

describe('PlaceChip', () => {
  it.each(locales)('shows the place and offers to show it on the map (%s)', async (locale) => {
    await renderUi(<PlaceChip name="بدر" onPress={jest.fn()} />, { locale });
    expect(screen.getByText('بدر')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: locale === 'ar' ? 'المكان: بدر. يعرضه على الخريطة' : 'Place: بدر. Shows it on the map' }),
    ).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<PlaceChip name="بدر" onPress={onPress} />);
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('«أخرى» is a dashed, inert chip', async () => {
    await renderUi(<PlaceChip name="أخرى" onPress={jest.fn()} other />);
    const chip = screen.getByTestId('seerah-place-chip');
    expect(flatStyle(chip.props.style).borderStyle).toBe('dashed');
    expect(chip.props.accessibilityRole).toBe('text');
    expect(chip.props.accessibilityLabel).toBe('أخرى');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is at least 44 pt tall and keeps Arabic right to left in English', async () => {
    await renderUi(<PlaceChip name="بدر" onPress={jest.fn()} />, { locale: 'en' });
    expect(flatStyle(screen.getByTestId('seerah-place-chip').props.style).minHeight).toBe(44);
    expect(flatStyle(screen.getByText('بدر').props.style)).toMatchObject({ writingDirection: 'rtl' });
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/PlaceChip.tsx')).toEqual([]);
    expect(themes.light.colors.line).toBeDefined();
  });
});
