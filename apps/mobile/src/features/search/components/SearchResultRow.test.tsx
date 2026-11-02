import { fireEvent } from '@testing-library/react-native';

import { flatStyle, renderUi } from '../../../../jest/render-ui';
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

const hidden = { includeHiddenElements: true } as const;

describe('SearchResultRow', () => {
  it('draws the Search frame card: the reference «الفاتحة · ٢» above the ayah', async () => {
    const view = await renderUi(
      <SearchResultRow chapter={chapter} highlightedPositions={[]} onPress={() => undefined} testID="result" verse={verse} words={words} />,
    );

    expect(view.getByText('الفاتحة · ٢')).toBeOnTheScreen();
    expect(flatStyle(view.getByText('الفاتحة · ٢').props.style)).toMatchObject({
      color: themes.light.colors.inkMuted,
      fontSize: 12,
    });
    expect(view.getByText('ٱلْحَمْدُ', hidden)).toBeOnTheScreen();
    expect(view.queryByTestId('search-result-chevron', hidden)).toBeNull();
  });

  it('outlines the matched words', async () => {
    const view = await renderUi(
      <SearchResultRow chapter={chapter} highlightedPositions={[1]} onPress={() => undefined} testID="result" verse={verse} words={words} />,
    );

    expect(view.getByTestId('result-text-match-1', hidden)).toBeOnTheScreen();
  });

  it.each([
    ['ar', 'الحمد لله رب العالمين الآية ٢, الفاتحة · ٢'],
    ['en', 'الحمد لله رب العالمين Ayah 2, Al-Fatihah · 2'],
  ] as const)('labels the ayah with its Imla\'i text, number and reference in %s', async (locale, name) => {
    const view = await renderUi(
      <SearchResultRow chapter={chapter} highlightedPositions={[]} onPress={() => undefined} verse={verse} words={words} />,
      { locale },
    );

    expect(view.getByRole('button', { name })).toBeOnTheScreen();
  });

  it('calls onPress', async () => {
    const onPress = jest.fn();
    const view = await renderUi(
      <SearchResultRow chapter={chapter} highlightedPositions={[]} onPress={onPress} verse={verse} words={words} />,
    );

    await fireEvent.press(view.getByRole('button'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has no raw colour literals', () => {
    expect(featureComponentLiterals('features/search/components/SearchResultRow.tsx')).toEqual([]);
  });
});
