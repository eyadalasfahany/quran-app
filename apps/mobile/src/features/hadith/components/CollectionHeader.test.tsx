import { screen } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { rawColorLiteralsInFeature } from '../../../../jest/feature-ui-source';
import { physicalSides } from '../../../../jest/hadith-ui-fixtures';
import { themes } from '@/core/theme';
import { maxFontScale } from '@/shared/ui';

import { CollectionHeader } from './CollectionHeader';

const TEST_ID = 'collection-header';
const TITLE = '[اسم المجموعة]';
const AUTHOR = '[اسم المؤلف]';
const COLLECTION = { slug: 'bukhari', number: 1, titleAr: TITLE, titleEn: '[Collection name]', authorAr: AUTHOR, authorEn: '[Author name]' };

function renderHeader(
  props: Partial<Parameters<typeof CollectionHeader>[0]> = {},
  options: { locale?: 'ar' | 'en'; theme?: 'light' | 'sepia' | 'dark' } = {},
) {
  return renderUi(
    <CollectionHeader
      booksCount={42}
      collection={COLLECTION}
      soleBook={false}
      totalHadith={5432}
      variant="centered"
      {...props}
    />,
    options,
  );
}

describe('CollectionHeader', () => {
  it.each(locales)('renders in Arabic and English (%s)', async (locale) => {
    await renderHeader({}, { locale });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(locale === 'ar' ? TITLE : '[Collection name]');
  });

  it('centered: shows the 96 by 128 cover, title, author and counts, with no source footnote', async () => {
    await renderHeader();
    expect(screen.getByTestId(`${TEST_ID}-cover`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent(TITLE);
    expect(screen.getByTestId(`${TEST_ID}-author`)).toHaveTextContent(AUTHOR);
    expect(screen.getByTestId(`${TEST_ID}-counts`)).toHaveTextContent(/٥٤٣٢ حديثًا · ٤٢ كتابًا/);
    expect(screen.queryByText('المصدر: fawazahmed0/hadith-api')).toBeNull();
  });

  it('inline: shows the 40 by 53 cover beside the text', async () => {
    await renderHeader({ variant: 'inline', soleBook: true, booksCount: 1 });
    expect(screen.getByTestId(`${TEST_ID}-counts`)).toHaveTextContent(/كتاب واحد/);
  });

  it('hides the author when null', async () => {
    await renderHeader({ collection: { ...COLLECTION, authorAr: null } });
    expect(screen.queryByTestId(`${TEST_ID}-author`)).toBeNull();
  });

  it('shows the numbered fallback title and an ornament-only cover when untitled', async () => {
    await renderHeader({ collection: { ...COLLECTION, titleAr: null } });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('مجموعة ١');
    expect(screen.getByRole('image', { name: 'غلاف مجموعة' })).toBeOnTheScreen();
  });

  it('uses titleEn in English', async () => {
    await renderHeader({}, { locale: 'en' });
    expect(screen.getByTestId(`${TEST_ID}-title`)).toHaveTextContent('[Collection name]');
  });

  it('shows the header role on the title', async () => {
    await renderHeader();
    expect(screen.getByRole('header', { name: TITLE })).toBeOnTheScreen();
  });

  it('uses start and end, never left and right', async () => {
    await renderHeader({ variant: 'inline' });
    expect(physicalSides(flatStyle(screen.getByTestId(TEST_ID).props.style))).toEqual([]);
  });

  it.each(['light', 'sepia', 'dark'] as const)('reads its colours from the theme (%s)', async (theme) => {
    await renderHeader({}, { theme });
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-counts`).props.style).color).toBe(themes[theme].colors.inkMuted);
  });

  it('has no raw colour literal', () => {
    expect(rawColorLiteralsInFeature('src/features/hadith/components/CollectionHeader.tsx')).toEqual([]);
  });

  it('keeps text scalable and unclipped at the largest size', async () => {
    await renderHeader();
    expect(screen.getByTestId(`${TEST_ID}-title`).props.maxFontSizeMultiplier).toBe(maxFontScale.content);
    expect(flatStyle(screen.getByTestId(`${TEST_ID}-title`).props.style)).not.toHaveProperty('height');
  });
});
