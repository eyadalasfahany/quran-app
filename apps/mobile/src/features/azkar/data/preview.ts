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
