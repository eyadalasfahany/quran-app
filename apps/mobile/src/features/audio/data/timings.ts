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
 * start >= end or two rows overlap. Touching rows (next.start === prev.end) are valid.
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
  return validTimings(
    rows.map((row) => ({
      verseId: row.verseId,
      startMs: row.startMs,
      endMs: row.endMs,
      segments: parseSegments(row.segments),
    })),
  );
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
