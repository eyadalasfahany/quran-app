import type { SqlExecutor } from '@/core/db/sql-executor';
import { resolvePlanBounds } from '@/features/khatma/plan-bounds';
import { planProgress } from '@/features/khatma/data/plan';
import type { KhatmaLog, KhatmaPlan } from '@/features/khatma/data/model';

/** The active Khatma plan's position today, for Home's wird card, the daily progress card and the widgets. */
export type HomeWird = {
  dayIndex: number;
  durationDays: number;
  pagesRead: number;
  pagesTotal: number;
  /** Pages logged today. */
  pagesToday: number;
  /** Today's target: what the plan asks for from today on. */
  todayTarget: number;
};

/**
 * The wird for `today` from a plan and its logs. Null when the plan's start verse does not resolve against the content.
 * Pure: the caller reads the plan, the logs and the content.
 */
export function homeWirdFor(input: {
  plan: Pick<KhatmaPlan, 'startDate' | 'durationDays' | 'startVerseId'>;
  logs: readonly Pick<KhatmaLog, 'date' | 'pagesRead'>[];
  executor: SqlExecutor;
  today: string;
}): HomeWird | null {
  const { plan, logs, executor, today } = input;
  const bounds = resolvePlanBounds(executor, plan.startVerseId);
  if (bounds === null) {
    return null;
  }
  const progress = planProgress(plan, logs, today, bounds.pagesTotal);
  const pagesToday = logs.filter((log) => log.date === today).reduce((sum, log) => sum + log.pagesRead, 0);
  return {
    dayIndex: progress.dayIndex,
    durationDays: plan.durationDays,
    pagesRead: progress.pagesRead,
    pagesToday,
    pagesTotal: progress.pagesTotal,
    todayTarget: progress.todayTarget,
  };
}
