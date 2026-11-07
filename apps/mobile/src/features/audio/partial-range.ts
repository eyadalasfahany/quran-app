import type { ChapterAudio } from './data/audio-files';

/** The ayahs a partial surah's file records (ADR 0077 amendment), 1-based and inclusive. */
export type AyahRange = { first: number; last: number };

/** The recorded range of an audio file, or null for a whole surah (every QF and MP3Quran row). */
export function recordedRange(audio: Pick<ChapterAudio, 'firstAyah' | 'lastAyah'> | undefined): AyahRange | null {
  if (audio === undefined || audio.firstAyah === null || audio.lastAyah === null) {
    return null;
  }
  return { first: audio.firstAyah, last: audio.lastAyah };
}

/** Whether the file records this ayah. A whole surah (null range) records every ayah. */
export function isAyahRecorded(range: AyahRange | null, verseNumber: number): boolean {
  return range === null || (verseNumber >= range.first && verseNumber <= range.last);
}

/** Whether the file starts after the surah's first ayah. */
export function startsLate(range: AyahRange | null): boolean {
  return range !== null && range.first > 1;
}

/** Whether the file stops before the surah's last ayah. */
export function endsEarly(range: AyahRange | null, versesCount: number): boolean {
  return range !== null && range.last < versesCount;
}
