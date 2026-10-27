import type { ChapterRecord } from '@/features/reader/data/chapters';
import type { MushafLine } from '@/features/reader/data/mushaf';

export const GLYPH_AL_FATIHA_1 = '\uE001\uE002';
export const GLYPH_AL_FATIHA_2 = '\uE003';
export const GLYPH_BAQARAH_1 = '\uF101\uF102';
export const GLYPH_END_1 = '\uE999';

export const pageOneLines: MushafLine[] = [
  { line: 3, words: [{ wordId: 1, verseId: 1, positionInVerse: 1, charType: 'word', glyph: GLYPH_AL_FATIHA_1, positionInLine: 1 }] },
  {
    line: 4,
    words: [
      { wordId: 2, verseId: 1, positionInVerse: 2, charType: 'word', glyph: GLYPH_AL_FATIHA_2, positionInLine: 1 },
      { wordId: 3, verseId: 1, positionInVerse: 3, charType: 'end', glyph: GLYPH_END_1, positionInLine: 2 },
    ],
  },
];

export const pageTwoLines: MushafLine[] = [
  {
    line: 3,
    words: [{ wordId: 10, verseId: 8, positionInVerse: 1, charType: 'word', glyph: GLYPH_BAQARAH_1, positionInLine: 1 }],
  },
];

export const chapterOneStart: ChapterRecord = {
  id: 1,
  nameArabic: 'سُورَةُ الفَاتِحَة',
  nameSimple: 'Al-Fatihah',
  nameEn: 'The Opening',
  revelationPlace: 'makkah',
  revelationOrder: 5,
  versesCount: 7,
  bismillahPre: 0,
  bismillahText: null,
  bismillahImlaei: null,
  pageStart: 1,
  pageEnd: 1,
};

export const chapterTwoStart: ChapterRecord = {
  id: 2,
  nameArabic: 'سُورَةُ البَقَرَة',
  nameSimple: 'Al-Baqarah',
  nameEn: 'The Cow',
  revelationPlace: 'madinah',
  revelationOrder: 87,
  versesCount: 286,
  bismillahPre: 1,
  bismillahText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  bismillahImlaei: 'بسم الله الرحمن الرحيم',
  pageStart: 2,
  pageEnd: 49,
};
