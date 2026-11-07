import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithNumberBadge } from './HadithNumberBadge';

const TEST_ID = 'hadith-number-badge';

describe('HadithNumberBadge', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithNumberBadge number="1234" size="pill" />, { locale });
    const expected = locale === 'ar' ? '١٢٣٤' : '1234';
    expect(screen.getByTestId(`${TEST_ID}-number`, { includeHiddenElements: true })).toHaveTextContent(expected);
  });

  it('draws the pill at 28 high with a 1 pt gold ring', async () => {
    await renderUi(<HadithNumberBadge number="1" size="pill" />);
    const style = flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style);
    expect(style).toMatchObject({ minHeight: 28, minWidth: 28, borderWidth: 1, borderRadius: 14 });
  });

  it('draws the circle at 36 with a 1.25 gold ring and brand digits', async () => {
    await renderUi(<HadithNumberBadge number="1" size="circle" />);
    const style = flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style);
    expect(style).toMatchObject({ minHeight: 36, minWidth: 36, borderWidth: 1.25, borderRadius: 18 });
    const digits = flatStyle(screen.getByTestId(`${TEST_ID}-number`, { includeHiddenElements: true }).props.style);
    expect(digits.color).toBe(themes.light.colors.brand);
  });

  it('grows the pill for a wide number', async () => {
    await renderUi(<HadithNumberBadge number="2787.2" size="pill" />);
    const style = flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style);
    expect(style.minWidth).toBe(28);
    expect(style).not.toHaveProperty('width');
    expect(style).not.toHaveProperty('height');
  });

  it('formats 2787.2 as ٢٧٨٧٫٢ in Arabic and 2787.2 in English', async () => {
    const view = await renderUi(<HadithNumberBadge number="2787.2" size="pill" />, { locale: 'ar' });
    expect(view.getByTestId(`${TEST_ID}-number`, { includeHiddenElements: true })).toHaveTextContent('٢٧٨٧٫٢');
    await view.unmount();

    await renderUi(<HadithNumberBadge number="2787.2" size="pill" />, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-number`, { includeHiddenElements: true })).toHaveTextContent('2787.2');
  });

  it('is hidden from screen readers', async () => {
    await renderUi(<HadithNumberBadge number="1" size="pill" />);
    const root = screen.getByTestId(TEST_ID, { includeHiddenElements: true });
    expect(root.props.accessibilityElementsHidden).toBe(true);
    expect(root.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.queryByRole('text')).toBeNull();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithNumberBadge number="1" size="circle" />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithNumberBadge number="1" size="pill" />, { theme });
    const style = flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style);
    expect(style.borderColor).toBe(themes[theme].colors.gold);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithNumberBadge.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithNumberBadge number="1" size="pill" />);
    expect(screen.getByTestId(`${TEST_ID}-number`, { includeHiddenElements: true }).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID, { includeHiddenElements: true }).props.style)).not.toHaveProperty('height');
  });
});
