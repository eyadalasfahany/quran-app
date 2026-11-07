import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { press } from '../../../../jest/azkar-ui-fixtures';
import { PLACEHOLDER_TEXT, physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { SavedHadithRow, type SavedHadithRowData } from './SavedHadithRow';

const TEST_ID = 'saved-hadith-row';
const COLLECTION = '[اسم المجموعة]';
const BOOK = '[اسم الكتاب]';

const VERIFIED: SavedHadithRowData = {
  collection: { number: 1, titleAr: COLLECTION, titleEn: '[Collection name]' },
  book: { bookNumber: '1', titleAr: BOOK, titleEn: '[Book name]' },
  hadithNumber: '1234',
  textAr: PLACEHOLDER_TEXT,
  unverified: false,
};
const UNVERIFIED: SavedHadithRowData = { ...VERIFIED, hadithNumber: null, textAr: null, unverified: true };

function renderRow(
  saved: SavedHadithRowData,
  options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {},
) {
  const onPress = jest.fn();
  return { onPress, view: renderUi(<SavedHadithRow onPress={onPress} saved={saved} />, options) };
}

describe('SavedHadithRow', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    const { view } = renderRow(VERIFIED, { locale });
    await view;
    expect(screen.getByTestId(`${TEST_ID}-text`)).toHaveTextContent(PLACEHOLDER_TEXT);
  });

  it('verified: shows the meta line, a two-line preview and the saved glyph', async () => {
    await renderRow(VERIFIED).view;
    expect(screen.getByTestId(`${TEST_ID}-meta`)).toHaveTextContent(`${COLLECTION} · ${BOOK} · ١٢٣٤`);
    expect(screen.getByTestId(`${TEST_ID}-text`).props.numberOfLines).toBe(2);
    expect(screen.getByTestId(`${TEST_ID}-glyph`, { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('unverified: shows the book title, the pill and «حديث محفوظ سابقًا» and no preview', async () => {
    await renderRow(UNVERIFIED).view;
    expect(screen.getByTestId(`${TEST_ID}-book`)).toHaveTextContent(BOOK);
    expect(screen.getByTestId(`${TEST_ID}-unverified`)).toHaveTextContent('غير مؤكد');
    expect(screen.getByTestId(`${TEST_ID}-previously`)).toHaveTextContent('حديث محفوظ سابقًا');
    expect(screen.queryByTestId(`${TEST_ID}-text`)).toBeNull();
  });

  it('unverified without a book shows the collection title', async () => {
    await renderRow({ ...UNVERIFIED, book: null }).view;
    expect(screen.getByTestId(`${TEST_ID}-book`)).toHaveTextContent(COLLECTION);
  });

  it('has the hairline border', async () => {
    await renderRow(VERIFIED).view;
    expect(flatStyle(screen.getByRole('button', { name: /١٢٣٤/ }).props.style)).toMatchObject({
      borderWidth: 1,
      borderColor: themes.light.colors.line,
    });
  });

  it('labels a verified row with meta then text', async () => {
    await renderRow(VERIFIED).view;
    expect(screen.getByRole('button', { name: `${COLLECTION}, ${BOOK}, ١٢٣٤, ${PLACEHOLDER_TEXT}` })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const { onPress, view } = renderRow(VERIFIED);
    await view;
    await press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses start and end, never left and right', async () => {
    await renderRow(VERIFIED).view;
    expect(physicalSides(flatStyle(screen.getByRole('button').props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderRow(VERIFIED, { theme }).view;
    expect(flatStyle(screen.getByRole('button').props.style).backgroundColor).toBe(themes[theme].colors.surfaceRaised);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/SavedHadithRow.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderRow(VERIFIED).view;
    expect(screen.getByTestId(`${TEST_ID}-meta`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByRole('button').props.style)).not.toHaveProperty('height');
  });


  it('shows the placeholder note instead of an empty preview', async () => {
    await renderUi(
      <SavedHadithRow
        onPress={jest.fn()}
        saved={{ collection: { number: 1, titleAr: null, titleEn: null }, book: { bookNumber: '2', titleAr: null, titleEn: null }, hadithNumber: '5730', textAr: '', unverified: false, placeholder: true }}
      />,
      { locale: 'ar' },
    );
    expect(screen.getByTestId('saved-hadith-row-note')).toHaveTextContent('الحديث ٥٧٣٠ غير متوفر حاليًا في المصدر');
    expect(screen.queryByTestId('saved-hadith-row-text')).toBeNull();
  });
});
