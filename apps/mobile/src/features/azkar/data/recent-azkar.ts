import type { RecentScope } from './recent-scopes';
import type { ResolvedAzkarScope } from './scope-resolver';
import { completedUnitsIn, type ScopeSummary } from './progress';

/** One «آخر الأذكار» row before its title and link are localised: the scope, its progress and whether it is done. */
export type RecentAzkarEntry = {
  scope: ResolvedAzkarScope;
  completed: number;
  total: number;
  done: boolean;
  openedAt: number;
};

/**
 * The recent scopes that still resolve against content, newest first, each with its progress in the current period.
 * A scope whose content has gone (or never existed) is dropped rather than shown as a dead row.
 */
export function buildRecentAzkarEntries(
  scopes: readonly RecentScope[],
  resolve: (scopeKey: string) => ResolvedAzkarScope | null,
  summaries: readonly ScopeSummary[],
): RecentAzkarEntry[] {
  const rows: RecentAzkarEntry[] = [];
  for (const recent of scopes) {
    const scope = resolve(recent.scopeKey);
    if (scope === null) {
      continue;
    }
    const completed = Math.min(completedUnitsIn(summaries, scope.scopeKey, scope.periodKey), scope.total);
    rows.push({
      completed,
      done: scope.total > 0 && completed >= scope.total,
      openedAt: recent.openedAt,
      scope,
      total: scope.total,
    });
  }
  return rows;
}
