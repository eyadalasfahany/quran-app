import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { ChapterRunRow } from './ChapterRunRow';

const TEST_ID = 'chapter-run-row';
const RUN: { firstNumber: string; lastNumber: string; count: number } = {
  firstNumber: '12',
  lastNumber: '30',
  count: 4,
};
const SINGLE: { firstNumber: string; lastNumber: string; count: number } = {
  firstNumber: '7',
  lastNumber: '7',
  count: 1,
};

function renderRow(
  run: Partial<typeof RUN> = {},
  options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {},
) {
  const onPress = jest.fn();
  return { onPress, view: renderUi(<ChapterRunRow onPress={onPress} run={{ ...RUN, ...run }} />, options) };
}

describe('ChapterRunRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderRow({}, { locale });
    await view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toBeOnTheScreen();
  });

  it('shows the range title in Arabic digits with an en dash', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('أحاديث ١٢–٣٠');
  });

  it('shows the range title in English digits in the English UI', async () => {
    await renderRow({}, { locale: 'en' }).view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('Hadith 12–30');
  });

  it('shows the single-hadith title for a run of one', async () => {
    await renderRow(SINGLE).view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('حديث ٧');
  });

  it('shows the count line with the plural helper and counts placeholder rows', async () => {
    await renderRow({ count: 4 }).view;
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveTextContent('٤ أحاديث');
  });

  it('shows a list icon and a chevron', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-icon`, { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('is at least 44 high', async () => {
    await renderRow().view;
    expect(flatStyle(screen.getByRole('button').props.style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('calls onPress', async () => {
    const { onPress, view } = renderRow();
    await view;
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes its role and a full label', async () => {
    await renderRow().view;
    expect(screen.getByRole('button', { name: 'أحاديث ١٢–٣٠, ٤ أحاديث' })).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderRow().view;
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow({}, { theme }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/ChapterRunRow.tsx')).toEqual([]);
  });

  it('keeps text scalable at the largest size', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
