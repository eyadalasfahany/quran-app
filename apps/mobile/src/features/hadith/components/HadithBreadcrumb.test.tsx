import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithBreadcrumb } from './HadithBreadcrumb';

const TEST_ID = 'hadith-breadcrumb';
const COLLECTION = '[اسم المجموعة]';
const BOOK = '[اسم الكتاب]';

describe('HadithBreadcrumb', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />, { locale });
    expect(screen.getByText(COLLECTION)).toBeOnTheScreen();
    expect(screen.getByText(BOOK)).toBeOnTheScreen();
  });

  it('shows the collection at 13 semibold over the book at 12 muted', async () => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />);
    expect(flatStyle(screen.getByText(COLLECTION).props.style).fontSize).toBe(13);
    const book = flatStyle(screen.getByText(BOOK).props.style);
    expect(book.fontSize).toBe(12);
    expect(book.color).toBe(themes.light.colors.inkMuted);
  });

  it('is one header with a combined label', async () => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />);
    expect(screen.getByRole('header', { name: `${COLLECTION}, ${BOOK}` })).toBeOnTheScreen();
  });

  it('truncates to one line each', async () => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />);
    expect(screen.getByText(COLLECTION).props.numberOfLines).toBe(1);
    expect(screen.getByText(BOOK).props.numberOfLines).toBe(1);
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />, { theme });
    expect(flatStyle(screen.getByText(BOOK).props.style).color).toBe(themes[theme].colors.inkMuted);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithBreadcrumb.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithBreadcrumb bookTitle={BOOK} collectionTitle={COLLECTION} />);
    expect(screen.getByTestId(`${TEST_ID}-collection`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(screen.getByTestId(`${TEST_ID}-book`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });
});
