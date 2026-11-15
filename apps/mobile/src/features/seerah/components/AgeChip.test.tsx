import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { themes } from '@/core/theme';

import { AgeChip } from './AgeChip';

describe('AgeChip', () => {
  it('shows the age first and the Hijri year as a small detail (ar)', async () => {
    await renderUi(<AgeChip age={54} onPress={jest.fn()} />);
    expect(screen.getByText('عمره ٥٤ سنة')).toBeOnTheScreen();
    expect(screen.getByText('٢ هـ')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'عمره ٥٤ سنة، ٢ هـ. يعرض هذا العمر على الخريطة' })).toBeOnTheScreen();
  });

  it('English uses Western digits and AH', async () => {
    await renderUi(<AgeChip age={54} onPress={jest.fn()} />, { locale: 'en' });
    expect(screen.getByText('Age 54')).toBeOnTheScreen();
    expect(screen.getByText('2 AH')).toBeOnTheScreen();
  });

  it.each([
    [0, '٥٣ ق.هـ'],
    [40, '١٣ ق.هـ'],
    [52, '١ ق.هـ'],
    [53, '١ هـ'],
    [63, '١١ هـ'],
  ])('age %i shows %s', async (age, era) => {
    await renderUi(<AgeChip age={age} onPress={jest.fn()} />);
    expect(screen.getByTestId('seerah-age-chip-era')).toHaveTextContent(era);
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    await renderUi(<AgeChip age={54} onPress={onPress} />);
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(locales)('an unspecified age is a dashed, inert chip (%s)', async (locale) => {
    const onPress = jest.fn();
    await renderUi(<AgeChip age={null} onPress={onPress} />, { locale });
    const chip = screen.getByTestId('seerah-age-chip');
    expect(screen.getByText(locale === 'ar' ? 'العمر غير محدد' : 'Age not stated')).toBeOnTheScreen();
    expect(flatStyle(chip.props.style).borderStyle).toBe('dashed');
    expect(chip.props.accessibilityRole).toBe('text');
    expect(screen.queryByTestId('seerah-age-chip-era')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is at least 44 pt tall and reads its colours from the theme', async () => {
    await renderUi(<AgeChip age={54} onPress={jest.fn()} />, { theme: 'dark' });
    const style = flatStyle(screen.getByTestId('seerah-age-chip').props.style);
    expect(style.minHeight).toBe(44);
    expect(style.backgroundColor).toBe(themes.dark.colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/seerah/components/AgeChip.tsx')).toEqual([]);
  });
});
