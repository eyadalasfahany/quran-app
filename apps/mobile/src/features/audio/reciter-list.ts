import { recitationStyleKey } from './player-view';

/** A catalogue reciter as the Listen tab reads it. `style` is QF's style string, null until the pack is installed. */
export type ReciterEntry = {
  resourceId: number;
  name: string | null;
  nameAr: string | null;
  installed: boolean;
  /** The catalogue's default reciter flag (`is_default`). */
  isDefault: boolean;
  style: string | null;
};

/** The chip filter: every reciter, or one QF style ("Murattal", "Mujawwad", "Muallim"). */
export type ReciterFilter = 'all' | 'Murattal' | 'Mujawwad' | 'Muallim';

// Harakat, the Quranic marks and tatweel go; alef forms, alef maqsura and taa marbuta fold together,
// so a search matches however the name was typed.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/gu;

export function normalizeForSearch(text: string): string {
  return text
    .replace(MARKS, '')
    .replace(/[أإآٱ]/gu, 'ا')
    .replace(/ى/gu, 'ي')
    .replace(/ة/gu, 'ه')
    .toLocaleLowerCase()
    .replace(/\s+/gu, ' ')
    .trim();
}

/** True when the query is empty, or appears in either the Arabic or the English name. */
export function matchesQuery(reciter: Pick<ReciterEntry, 'name' | 'nameAr'>, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === '') {
    return true;
  }
  return [reciter.nameAr, reciter.name].some((name) => name !== null && normalizeForSearch(name).includes(needle));
}

/** Reciters with no known style (not installed yet) match only «الكل». */
export function matchesFilter(reciter: Pick<ReciterEntry, 'style'>, filter: ReciterFilter): boolean {
  return filter === 'all' || reciter.style === filter;
}

/** The name in the interface language, then the other language, then the caller's fallback (the tafsir rule). */
export function reciterDisplayName(
  names: { name: string | null; nameAr: string | null },
  locale: 'ar' | 'en',
  fallback: string,
): string {
  const primary = locale === 'ar' ? names.nameAr : names.name;
  const secondary = locale === 'ar' ? names.name : names.nameAr;
  if (primary !== null && primary.trim() !== '') {
    return primary;
  }
  if (secondary !== null && secondary.trim() !== '') {
    return secondary;
  }
  return fallback;
}

export type ReciterStatus = 'nowPlaying' | 'failed' | 'teaching' | null;

/** The status line: playing wins, then a failed download, then the teaching style's note. */
export function reciterStatus({
  playing,
  failed,
  style,
}: {
  playing: boolean;
  failed: boolean;
  style: string | null;
}): ReciterStatus {
  if (playing) {
    return 'nowPlaying';
  }
  if (failed) {
    return 'failed';
  }
  if (recitationStyleKey(style) === 'player.style.muallim') {
    return 'teaching';
  }
  return null;
}
