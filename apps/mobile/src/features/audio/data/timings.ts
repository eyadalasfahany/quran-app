import type { SqlExecutor } from '@/core/db/sql-executor';

/** `[word position, start ms, end ms]`, as stored in `recitation_timings.segments`. */
export type WordSegment = [position: number, startMs: number, endMs: number];

export type AyahTiming = {
  verseId: number;
  startMs: number;
  endMs: number;
  segments: WordSegment[] | null;
};

type TimingRow = Omit<AyahTiming, 'segments'> & { segments: string | null };

/**
 * Timings for one audio file, sorted by start. Returns [] (no highlight, spec §12) when any row has
 * start >= end, two rows overlap, or the file's surah is unknown or not fully covered: one row per ayah of the
 * surah, so a highlight never stops partway or lands on the wrong ayah (ADR 0052). Touching rows
 * (next.start === prev.end) are valid.
 */
export function timingsFor(db: SqlExecutor, audioFileId: number): AyahTiming[] {
  const rows = db.all<TimingRow>(
    `SELECT
       verse_id AS verseId,
       start_ms AS startMs,
       end_ms AS endMs,
       segments
     FROM recitation_timings
     WHERE audio_file_id = ?
     ORDER BY start_ms`,
    [audioFileId],
  );
  const surah = db.get<{ versesCount: number }>(
    `SELECT chapters.verses_count AS versesCount
     FROM chapter_audio_files
     JOIN chapters ON chapters.id = chapter_audio_files.chapter_id
     WHERE chapter_audio_files.id = ?`,
    [audioFileId],
  );
  if (surah === undefined || rows.length !== surah.versesCount) {
    return [];
  }
  return validTimings(
    rows.map((row) => ({
      verseId: row.verseId,
      startMs: row.startMs,
      endMs: row.endMs,
      segments: parseSegments(row.segments),
    })),
  );
}

/** A last timing may end this much after the audio does (rounding, a trailing breath) and still match it. */
export const TIMING_END_SLACK_MS = 2_000;
/** Audio after the last timing (silence, a closing du'a) up to the larger of this and TIMING_TAIL_SHARE of the file. */
export const TIMING_TAIL_MIN_MS = 15_000;
export const TIMING_TAIL_SHARE = 0.05;

/**
 * Whether a file's timings match the audio the player loaded (ADR 0052). They do not when the last ayah ends well after
 * the audio does, or when far more audio follows the last ayah than silence or a closing du'a explains: both mean the
 * timings were made for a different recording, and following them would highlight the wrong ayah. No timings fit
 * trivially (there is nothing to highlight).
 */
export function timingsFitAudio(timings: readonly AyahTiming[], durationMs: number): boolean {
  const last = timings.at(-1);
  if (last === undefined || durationMs <= 0) {
    return true;
  }
  const tailAllowed = Math.max(TIMING_TAIL_MIN_MS, durationMs * TIMING_TAIL_SHARE);
  return last.endMs <= durationMs + TIMING_END_SLACK_MS && durationMs - last.endMs <= tailAllowed;
}

/**
 * Sorts by start and checks the result. Returns the sorted rows, or [] when a row has start >= end
 * or a row starts before the previous one ends.
 */
export function validTimings(rows: readonly AyahTiming[]): AyahTiming[] {
  const sorted = [...rows].sort((a, b) => a.startMs - b.startMs);
  for (const row of sorted) {
    if (row.startMs >= row.endMs) {
      return [];
    }
  }
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const next = sorted[index];
    if (previous !== undefined && next !== undefined && next.startMs < previous.endMs) {
      return [];
    }
  }
  return sorted;
}

/** Parses a segments JSON value. A missing, malformed or wrongly shaped value becomes null. */
export function parseSegments(raw: string | null): WordSegment[] | null {
  if (raw === null) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const segments: WordSegment[] = [];
  for (const item of value) {
    if (!isSegment(item)) {
      return null;
    }
    segments.push(item);
  }
  return segments;
}

function isSegment(value: unknown): value is WordSegment {
  return Array.isArray(value) && value.length === 3 && value.every((part) => Number.isInteger(part) && part >= 0);
}
