import type { AzkarProgressPeriod } from './model';
import { completedUnitsIn, periodKey, scopeKeyForCategory, type ScopeSummary } from './progress';

/** One category's progress for its current period (Home's «أذكار مختارة» and the daily goals use it). */
export type CategoryPeriodProgress = { completed: number; total: number; done: boolean };

/**
 * Units completed in the category's current period. A period that has rolled over (yesterday's daily row, say) counts
 * for nothing, because `periodKey` for `now` no longer matches it. `done` needs at least one unit.
 */
export function categoryPeriodProgress(
  category: { id: string; unitCount: number; progressPeriod: AzkarProgressPeriod },
  summaries: readonly ScopeSummary[],
  now: Date,
): CategoryPeriodProgress {
  const completed = completedUnitsIn(summaries, scopeKeyForCategory(category.id), periodKey(category.progressPeriod, now));
  const total = category.unitCount;
  const capped = Math.min(completed, total);
  return { completed: capped, done: total > 0 && capped >= total, total };
}
