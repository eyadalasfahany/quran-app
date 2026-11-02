import { toLocalDateString } from '@/features/khatma/data/plan';

/** Payload the watch sends with `transferUserInfo` (ADR 0035 §3). */
export type WatchMisbahaDelta = {
  source: 'watch';
  installId: string;
  seq: number;
  /** Local calendar day (YYYY-MM-DD) when the taps happened on the watch. */
  date: string;
  /** Positive tap count in this delivery. */
  taps: number;
};

export type WatchMergeState = {
  /** Last applied `seq` per watch install id. */
  lastSeqByInstallId: Record<string, number>;
};

function isWatchDelta(value: unknown): value is WatchMisbahaDelta {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const row = value as Record<string, unknown>;
  return (
    row.source === 'watch' &&
    typeof row.installId === 'string' &&
    row.installId.length > 0 &&
    typeof row.seq === 'number' &&
    Number.isInteger(row.seq) &&
    row.seq >= 0 &&
    typeof row.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
    typeof row.taps === 'number' &&
    Number.isInteger(row.taps) &&
    row.taps > 0
  );
}

/**
 * Merges watch misbaha deltas into today's total only (ADR 0035 §3). Dedupes by `installId` + `seq`, drops non-today
 * dates and non-positive `taps`. Returns the new merge state and how many taps to add to today's total.
 */
export function mergeWatchMisbahaDeltas(params: {
  deltas: readonly unknown[];
  mergeState: WatchMergeState;
  now: Date;
}): { mergeState: WatchMergeState; tapsToAdd: number } {
  const today = toLocalDateString(params.now);
  const lastSeqByInstallId = { ...params.mergeState.lastSeqByInstallId };
  let tapsToAdd = 0;

  const parsed = params.deltas.filter(isWatchDelta).sort((left, right) => left.seq - right.seq);

  for (const delta of parsed) {
    if (delta.date !== today) {
      continue;
    }
    const lastSeq = lastSeqByInstallId[delta.installId] ?? 0;
    if (delta.seq <= lastSeq) {
      continue;
    }
    lastSeqByInstallId[delta.installId] = delta.seq;
    tapsToAdd += delta.taps;
  }

  return { mergeState: { lastSeqByInstallId }, tapsToAdd };
}
