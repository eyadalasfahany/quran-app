import { getTableConfig } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';

import { openUserDb } from '@/core/db/user/open';
import { azkarProgress } from '@/core/db/user/schema';

import { liveProgressSummaryQuery } from './live-queries';
import type { ScopeSummary } from './progress';

/**
 * One live read of the (scope, period) progress summaries, shared by every Azkar hook that uses it. Home mounts four
 * consumers of it (the continue card, the session rows, the daily progress and the recent list); each used to run its
 * own live query. Here the first subscriber starts one query and one change listener, every later subscriber shares
 * them, and the last one to leave stops them.
 */

/** Where the summaries come from. Production reads user.db; tests pass fakes. */
export type SummarySource = {
  /** Reads every (scope, period) summary once. */
  load(): Promise<ScopeSummary[]>;
  /** Calls `onChange` whenever the progress table changes. Returns the stop function. */
  watch(onChange: () => void): () => void;
};

export type SharedSummaries = {
  /** For `useSyncExternalStore`: registers a listener and returns the function that removes it. */
  subscribe(listener: () => void): () => void;
  /** The latest summaries. Same array identity until a load replaces it. */
  getSnapshot(): ScopeSummary[];
};

const NO_SUMMARIES: ScopeSummary[] = [];

export function createSharedSummaries(source: SummarySource): SharedSummaries {
  let rows: ScopeSummary[] = NO_SUMMARIES;
  const listeners = new Set<() => void>();
  let stopWatching: (() => void) | null = null;

  const refresh = () => {
    source
      .load()
      .then((next) => {
        rows = next;
        for (const listener of listeners) {
          listener();
        }
      })
      .catch(() => undefined);
  };

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        stopWatching = source.watch(refresh);
        refresh();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stopWatching?.();
          stopWatching = null;
        }
      };
    },
    getSnapshot() {
      return rows;
    },
  };
}

/** The production source: `azkar_progress` in user.db, re-read on each change to that table. */
const userDbSummarySource: SummarySource = {
  async load() {
    const { db } = openUserDb();
    const data = await liveProgressSummaryQuery(db);
    return data.map((row) => ({
      scopeKey: row.scopeKey,
      periodKey: row.periodKey,
      completedUnits: Number(row.completedUnits),
      updatedAt: row.updatedAt ?? 0,
    }));
  },
  watch(onChange) {
    const tableName = getTableConfig(azkarProgress).name;
    const listener = addDatabaseChangeListener(({ tableName: changed }) => {
      if (changed === tableName) {
        onChange();
      }
    });
    return () => listener.remove();
  },
};

export const azkarProgressSummaries = createSharedSummaries(userDbSummarySource);
