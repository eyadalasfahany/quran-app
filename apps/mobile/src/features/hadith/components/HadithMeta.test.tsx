import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { HadithMeta } from './HadithMeta';

const TEST_ID = 'hadith-meta';
const COLLECTION = '[اسم المجموعة]';
const BOOK = '[اسم الكتاب]';

describe('HadithMeta', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="3.1" />, { locale });
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(locale === "ar" ? `${COLLECTION} · ${BOOK} · ٣٫١` : `${COLLECTION} · ${BOOK} · 3.1`);
  });

  it('joins collection, book and number with a dot', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="3" />, { locale: 'en' });
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(`${COLLECTION} · ${BOOK} · 3`);
  });

  it('leaves out a null book and a null number', async () => {
    await renderUi(<HadithMeta bookTitle={null} collectionTitle={COLLECTION} hadithNumber={null} />, { locale: 'en' });
    expect(screen.getByTestId(TEST_ID).props.children).toBe(COLLECTION);
  });

  it('formats the number with Arabic digits in Arabic', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="2787.2" />, { locale: 'ar' });
    expect(screen.getByTestId(TEST_ID)).toHaveTextContent(`${COLLECTION} · ${BOOK} · ٢٧٨٧٫٢`);
  });

  it('clamps to two lines', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="1" />);
    expect(screen.getByTestId(TEST_ID).props.numberOfLines).toBe(2);
  });

  it('gives the label as the same text joined with commas', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="1" />, { locale: 'en' });
    expect(screen.getByLabelText(`${COLLECTION}, ${BOOK}, 1`)).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="1" />);
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="1" />, { theme });
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style).color).toBe(themes[theme].colors.inkMuted);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/HadithMeta.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderUi(<HadithMeta bookTitle={BOOK} collectionTitle={COLLECTION} hadithNumber="1" />);
    expect(screen.getByTestId(TEST_ID).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(TEST_ID).props.style)).not.toHaveProperty('height');
  });
});
