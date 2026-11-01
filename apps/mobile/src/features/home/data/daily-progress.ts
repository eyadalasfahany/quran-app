import type { DailyGoals } from '@/features/daily-goals/data/goals';

/**
 * One goal's line in today's progress: what is done and what is asked, as numbers. The screen words it.
 * `fraction` is 0 to 1 and is 1 exactly when the goal is done.
 */
export type DailyGoalRow = {
  key: 'wird' | 'misbaha' | `session:${string}`;
  kind: 'wird' | 'misbaha' | 'session';
  /** The Azkar session id, for a session row. */
  sessionId?: string;
  completed: number;
  total: number;
  done: boolean;
  fraction: number;
};

export type DailyProgress = {
  /** The ring: the mean of the chosen goals' fractions, rounded. Zero with no goals. */
  percent: number;
  rows: DailyGoalRow[];
};

export type DailyProgressInput = {
  goals: DailyGoals;
  /** Today's wird, or null without an active plan. */
  wird: { pagesToday: number; todayTarget: number } | null;
  /** Every session category with its progress for its current period (see `categoryPeriodProgress`). */
  sessions: readonly { id: string; completed: number; total: number; done: boolean }[];
  /** Today's misbaha taps, or null when the misbaha is not offered (no Azkar content). */
  misbahaToday: number | null;
};

function fractionOf(completed: number, total: number): number {
  return total <= 0 ? 1 : Math.min(1, completed / total);
}

/**
 * Today's progress over the goals the user chose (ADR 0034 §5). Nothing chosen gives no rows and a zero ring. A goal
 * whose data is missing (no plan, no content) is left out, not shown as zero. Session progress is for the current
 * period, so a finished session from yesterday does not count.
 */
export function buildDailyProgress(input: DailyProgressInput): DailyProgress {
  const rows: DailyGoalRow[] = [];

  if (input.goals.wird && input.wird !== null) {
    const { pagesToday, todayTarget } = input.wird;
    rows.push({
      completed: pagesToday,
      done: fractionOf(pagesToday, todayTarget) >= 1,
      fraction: fractionOf(pagesToday, todayTarget),
      key: 'wird',
      kind: 'wird',
      total: todayTarget,
    });
  }

  for (const session of input.sessions) {
    if (!input.goals.sessions.includes(session.id)) {
      continue;
    }
    rows.push({
      completed: session.completed,
      done: session.done,
      fraction: session.done ? 1 : session.total <= 0 ? 0 : Math.min(1, session.completed / session.total),
      key: `session:${session.id}`,
      kind: 'session',
      sessionId: session.id,
      total: session.total,
    });
  }

  if (input.goals.misbahaTarget !== null && input.misbahaToday !== null) {
    const target = input.goals.misbahaTarget;
    const today = input.misbahaToday;
    rows.push({
      completed: today,
      done: today >= target,
      fraction: fractionOf(today, target),
      key: 'misbaha',
      kind: 'misbaha',
      total: target,
    });
  }

  if (rows.length === 0) {
    return { percent: 0, rows };
  }
  const mean = rows.reduce((sum, row) => sum + row.fraction, 0) / rows.length;
  return { percent: Math.round(mean * 100), rows };
}
