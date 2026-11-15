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

/** A lead-in fragment is short and ends with a colon («…ويقول:»), so it introduces the recited text rather than being it. */
const LEAD_IN_MAX_WORDS = 4;

/** True when `text` is a short lead-in fragment that only introduces the recitation. */
export function isLeadInFragment(text: string): boolean {
  const trimmed = text.replace(/^[\s.…]+/, '').trim();
  if (trimmed.length === 0) {
    return true;
  }
  return /[:：]$/.test(trimmed) && trimmed.split(/\s+/).length <= LEAD_IN_MAX_WORDS;
}

/**
 * The card preview of an entry, built from its recited text only. Instruction and narration steps never supply it.
 * A lead-in fragment is skipped, so the preview is the recitation body that follows it. Text is returned unaltered.
 */
export function recitationPreview(items: readonly AzkarItemDetail[]): string | null {
  for (const item of items) {
    if (item.kind !== 'recitation') {
      continue;
    }
    for (const segment of item.segments) {
      if (segment.kind !== 'text' || segment.textAr === null || segment.textAr.length === 0) {
        continue;
      }
      if (isLeadInFragment(segment.textAr)) {
        continue;
      }
      return segment.textAr;
    }
  }
  return null;
}

/** The surah and verse range of a Quran segment, for a card that opens with a Quran passage. */
export type QuranPreviewRef = { surah: number; verseFrom: number; verseTo: number };

/**
 * The first Quran segment of a list of items. Kept for callers that need one passage; cards use `quranRefs`. The card
 * shows its surah and verses in the UI font, never the verse text: an ayah is never clamped or set in the UI font.
 */
export function firstQuranRef(items: readonly AzkarItemDetail[]): QuranPreviewRef | null {
  return quranRefs(items)[0] ?? null;
}

/**
 * Every Quran segment of a list of items, in order, for a card. A card shows these references even when it also has a
 * text preview (an entry may open with a short lead-in and then a Quran passage). Verse text is never returned.
 */
export function quranRefs(items: readonly AzkarItemDetail[]): QuranPreviewRef[] {
  const refs: QuranPreviewRef[] = [];
  for (const item of items) {
    for (const segment of item.segments) {
      if (segment.kind === 'quran' && segment.quranSurah !== null && segment.quranVerseFrom !== null) {
        refs.push({ surah: segment.quranSurah, verseFrom: segment.quranVerseFrom, verseTo: segment.quranVerseTo ?? segment.quranVerseFrom });
      }
    }
  }
  return refs;
}
