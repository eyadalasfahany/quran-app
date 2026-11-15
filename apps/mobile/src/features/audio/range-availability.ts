import type { SqlExecutor } from '@/core/db/sql-executor';
import { getVerseByKey, type VerseRecord } from '@/features/reader/data/verses';

import { chapterAudio, type ChapterAudio } from './data/audio-files';
import { recitationIdForResource } from './data/reciters';
import { timingsFor, type AyahTiming } from './data/timings';
import { isAyahRecorded, recordedRange } from './partial-range';
import { isRangeInTimings } from './range-stop';

/**
 * Whether a verse range can play as a range with `reciterId`, checked before the tap (ADR 0092 decision 3). `ok` is the
 * only result that plays from the file's timings. `not-installed` still plays: the pack is installed first, as a verse
 * play does. Every other result is a reason the button shows as disabled, and the play never starts.
 */
export type RangePlayability =
  | 'ok'
  | 'not-installed'
  | 'no-reciter'
  | 'surah-unavailable'
  | 'no-timings'
  | 'not-recorded'
  /** The keys are not one surah's verses in order, or are not in the content database. */
  | 'invalid';

/** The checked range: the surah's file, both verses and the file's timings, when the range can play. */
export type RangeCheck =
  | { code: 'ok'; chapterId: number; from: VerseRecord; to: VerseRecord; audio: ChapterAudio; timings: AyahTiming[] }
  | { code: Exclude<RangePlayability, 'ok'> };

/**
 * Checks a verse range against the content database for `reciterId`, the reciter a play would use. Same lookups as the
 * player; the player and the dua button both read this, so they agree.
 */
export function rangeCheck(db: SqlExecutor, reciterId: number | null, fromKey: string, toKey: string): RangeCheck {
  if (reciterId === null) {
    return { code: 'no-reciter' };
  }
  const from = getVerseByKey(db, fromKey);
  const to = getVerseByKey(db, toKey);
  if (from === undefined || to === undefined || from.chapterId !== to.chapterId || from.verseNumber > to.verseNumber) {
    return { code: 'invalid' };
  }
  const recitationId = recitationIdForResource(db, reciterId);
  if (recitationId === undefined) {
    return { code: 'not-installed' };
  }
  const audio = chapterAudio(db, recitationId, from.chapterId);
  if (audio === undefined) {
    return { code: 'surah-unavailable' };
  }
  const range = recordedRange(audio);
  if (!isAyahRecorded(range, from.verseNumber) || !isAyahRecorded(range, to.verseNumber)) {
    return { code: 'not-recorded' };
  }
  const timings = timingsFor(db, audio.id);
  if (!isRangeInTimings({ chapterId: from.chapterId, fromVerseId: from.id, toVerseId: to.id }, timings)) {
    return { code: 'no-timings' };
  }
  return { code: 'ok', chapterId: from.chapterId, from, to, audio, timings };
}

/** The availability of a verse range for `reciterId`, for the button before the tap. */
export function rangePlayability(db: SqlExecutor, reciterId: number | null, fromKey: string, toKey: string): RangePlayability {
  return rangeCheck(db, reciterId, fromKey, toKey).code;
}
