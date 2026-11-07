import type { SqlExecutor } from '@/core/db/sql-executor';
import { openContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';

import { resolveCoveringNumber } from './covering-number';
import type { HadithNumberResolver, HadithPersonalStore } from './model';

export type ResolvedHadithStore = {
  db: SqlExecutor;
  /** Undefined when `content.db` cannot be opened; content lookups are then skipped. */
  content: SqlExecutor | undefined;
  resolver: HadithNumberResolver;
  now: () => number;
};

function openContentOrUndefined(): SqlExecutor | undefined {
  try {
    return openContentDb().executor;
  } catch {
    return undefined;
  }
}

/** Fills every default of a store in one place (plan step 11, section 2). */
export function resolveHadithStore(store?: HadithPersonalStore): ResolvedHadithStore {
  return {
    db: store?.db ?? openUserDb().executor,
    content: store?.content ?? openContentOrUndefined(),
    resolver: store?.resolver ?? resolveCoveringNumber,
    now: store?.now ?? Date.now,
  };
}
