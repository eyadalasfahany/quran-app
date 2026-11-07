import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { ChapterRow } from './ChapterRow';

const TEST_ID = 'chapter-row';
const TITLE = '[اسم الباب]';
const CHAPTER: { chapterNumber: number; titleAr: string | null; hadithCount: number } = {
  chapterNumber: 1,
  titleAr: TITLE,
  hadithCount: 24,
};

function renderRow(chapter: Partial<typeof CHAPTER> = {}, options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {}) {
  const onPress = jest.fn();
  return { onPress, view: renderUi(<ChapterRow chapter={{ ...CHAPTER, ...chapter }} onPress={onPress} />, options) };
}

describe('ChapterRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderRow({}, { locale });
    await view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
  });

  it('shows the title and count and a chevron', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
    expect(screen.getByTestId(`${TEST_ID}-count`)).toHaveTextContent('٢٤ حديثًا');
    expect(screen.getByTestId(`${TEST_ID}-chevron`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('shows the Arabic title right to left in the English UI', async () => {
    await renderRow({}, { locale: 'en' }).view;
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-title`).props.style)).toMatchObject({
      textAlign: 'right',
      writingDirection: 'rtl',
    });
  });

  it('falls back to «باب n»', async () => {
    await renderRow({ titleAr: null }).view;
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('باب ١');
  });

  it('is at least 60 high', async () => {
    await renderRow().view;
    expect(flatStyle(screen.getByRole('button').props.style).minHeight).toBe(60);
  });

  it('calls onPress', async () => {
    const { onPress, view } = renderRow();
    await view;
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes its role, label and state', async () => {
    await renderRow().view;
    expect(screen.getByRole('button', { name: `${TITLE}, ٢٤ حديثًا` })).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderRow().view;
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
    expect(physicalSides(flatStyle(screen.getByTestId(`${TEST_ID}-title`).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow({}, { theme }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/ChapterRow.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderRow().view;
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
  });
});
