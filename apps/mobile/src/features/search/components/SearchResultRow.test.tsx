import { fireEvent } from '@testing-library/react-native';

import { flatStyle, locales, renderUi } from '../../../../jest/render-ui';
import { featureComponentLiterals } from '../../../../jest/ui-source';
import { themes } from '@/core/theme';
import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { VerseRecord } from '@/features/reader/data/verses';
import type { WordRecord } from '@/features/reader/data/words';

import { SearchResultRow } from './SearchResultRow';

const chapter: ChapterRecord = {
  id: 1,
  nameArabic: 'الفاتحة',
  nameSimple: 'Al-Fatihah',
  nameEn: 'The Opening',
  revelationPlace: 'makkah',
  revelationOrder: 5,
  versesCount: 7,
  bismillahPre: 1,
  bismillahText: null,
  bismillahImlaei: null,
  pageStart: 1,
  pageEnd: 1,
};

const verse: VerseRecord = {
  id: 2,
  verseKey: '1:2',
  chapterId: 1,
  verseNumber: 2,
  juz: 1,
  hizb: 1,
  rubElHizb: 1,
  page: 1,
  sajdah: 'none',
  textUthmani: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
  textUthmaniTajweed: null,
  textIndopak: null,
  textImlaei: 'الحمد لله رب العالمين',
  textSearch: 'الحمد لله رب العالمين',
};

const words: WordRecord[] = [
  { verseId: 2, position: 1, charType: 'word', textUthmani: 'ٱلْحَمْدُ', textImlaei: 'الحمد' },
  { verseId: 2, position: 2, charType: 'word', textUthmani: 'لِلَّهِ', textImlaei: 'لله' },
  { verseId: 2, position: 3, charType: 'end', textUthmani: '٢', textImlaei: '٢' },
];

const hidden = { includeHiddenElements: true };

describe('SearchResultRow', () => {
  it('renders Uthmani text and a reference line', async () => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[1, 2]}
        onPress={() => undefined}
        testID="search-result"
        verse={verse}
        words={words}
      />,
    );

    expect(view.getByText(/ٱلْحَمْدُ/)).toBeOnTheScreen();
    expect(view.getByText(/1:2/)).toBeOnTheScreen();
  });

  it('exposes one accessibility label on the row button', async () => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={() => undefined}
        testID="search-result"
        verse={verse}
        words={words}
      />,
    );

    const button = view.getByRole('button');
    expect(button.props.accessibilityLabel).toContain('الحمد لله رب العالمين');
    expect(view.queryAllByLabelText(button.props.accessibilityLabel)).toHaveLength(1);
  });

  it('calls onPress when the row is pressed', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={onPress}
        verse={verse}
        words={words}
      />,
    );

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('draws the reference as a muted caption', async () => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={() => undefined}
        verse={verse}
        words={words}
      />,
    );

    expect(flatStyle(view.getByText(/1:2/).props.style)).toMatchObject({
      ...themes.light.text.caption,
      color: themes.light.colors.inkMuted,
    });
  });

  it.each([
    ['line', themes.light.colors.line],
    ['strong', themes.light.colors.lineStrong],
  ] as const)('draws a %s separator with Divider', async (separator, color) => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={() => undefined}
        separator={separator}
        testID="search-result"
        verse={verse}
        words={words}
      />,
    );

    expect(flatStyle(view.getByTestId('search-result-separator', hidden).props.style)).toMatchObject({
      backgroundColor: color,
      height: 1,
    });
  });

  it('has no separator by default', async () => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={() => undefined}
        testID="search-result"
        verse={verse}
        words={words}
      />,
    );

    expect(view.queryByTestId('search-result-separator', hidden)).toBeNull();
  });

  it.each(locales)('points the chevron forward in the reading direction (%s)', async (locale) => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[]}
        onPress={() => undefined}
        verse={verse}
        words={words}
      />,
      { locale },
    );

    expect(flatStyle(view.getByTestId('search-result-chevron', hidden).props.style).transform).toEqual(
      locale === 'ar' ? [{ scaleX: -1 }] : undefined,
    );
  });

  it.each(locales)('outlines highlighted words in %s', async (locale) => {
    const view = await renderUi(
      <SearchResultRow
        chapter={chapter}
        highlightedPositions={[1]}
        onPress={() => undefined}
        testID="search-result"
        verse={verse}
        words={words}
      />,
      { locale },
    );

    const highlighted = view.getByText(/ٱلْحَمْدُ/);
    expect(flatStyle(highlighted.props.style).borderWidth).toBe(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchResultRow.tsx')).toEqual([]);
    expect(featureComponentLiterals('features/search/components/UthmaniHighlightText.tsx')).toEqual([]);
  });
});
