import type { AzkarItemDetail } from './model';

/**
 * The first Arabic text segment of a list of items, for a card preview. Quran segments are not used here (they need
 * verse lookups), so an entry that opens with a Quran passage shows no preview. Text is returned unaltered.
 */
export function firstArabicText(items: readonly AzkarItemDetail[]): string | null {
  for (const item of items) {
    for (const segment of item.segments) {
      if (segment.kind === 'text' && segment.textAr !== null && segment.textAr.length > 0) {
        return segment.textAr;
      }
    }
  }
  return null;
}

/** The surah and verse range of a Quran segment, for a card that opens with a Quran passage. */
export type QuranPreviewRef = { surah: number; verseFrom: number; verseTo: number };

/**
 * The first Quran segment of a list of items, for a card with no Arabic text preview. The card shows its surah and
 * verses in the UI font, never the verse text: an ayah is never clamped or set in the UI font.
 */
export function firstQuranRef(items: readonly AzkarItemDetail[]): QuranPreviewRef | null {
  for (const item of items) {
    for (const segment of item.segments) {
      if (segment.kind === 'quran' && segment.quranSurah !== null && segment.quranVerseFrom !== null) {
        return { surah: segment.quranSurah, verseFrom: segment.quranVerseFrom, verseTo: segment.quranVerseTo ?? segment.quranVerseFrom };
      }
    }
  }
  return null;
}
