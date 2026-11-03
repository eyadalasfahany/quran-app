import type { DiscoverEntry, DiscoverId } from './registry';
import type { DiscoverState } from './store';

export type DiscoverRowState = {
  entry: DiscoverEntry;
  done: boolean;
  /** Badged «جديد»: the person has acknowledged a set and this row was added after it (ADR 0053 §5). */
  isNew: boolean;
};

/**
 * `progress`: the card shows the next rows. `done`: every row is complete and the «أحسنت» state shows.
 * `hidden`: nothing to show (hidden by the person and no new row since, or the set is acknowledged).
 */
export type DiscoverCardMode = 'progress' | 'done' | 'hidden';

export type DiscoverProgress = {
  rows: DiscoverRowState[];
  pending: DiscoverRowState[];
  doneCount: number;
  total: number;
  mode: DiscoverCardMode;
};

export const DISCOVER_CARD_ROW_COUNT = 3;

/** Pure: the rows, their badges and the card mode, from the registry and the stored state (ADR 0053 §4 and §5). */
export function computeDiscoverProgress(entries: readonly DiscoverEntry[], state: DiscoverState): DiscoverProgress {
  const doneIds = new Set<DiscoverId>(state.done);
  const acknowledged = state.acknowledged === null ? null : new Set<DiscoverId>(state.acknowledged);
  const rows: DiscoverRowState[] = entries.map((entry) => ({
    entry,
    done: doneIds.has(entry.id),
    isNew: acknowledged !== null && !acknowledged.has(entry.id),
  }));
  const pending = rows.filter((row) => !row.done);
  const hasUnacknowledged = acknowledged === null || entries.some((entry) => !acknowledged.has(entry.id));

  let mode: DiscoverCardMode;
  if (pending.length > 0) {
    mode = state.hidden && !hasUnacknowledged ? 'hidden' : 'progress';
  } else {
    mode = hasUnacknowledged ? 'done' : 'hidden';
  }

  return {
    rows,
    pending,
    doneCount: rows.length - pending.length,
    total: rows.length,
    mode,
  };
}
