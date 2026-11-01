import { NO_DAILY_GOALS, type DailyGoals } from '@/features/daily-goals/data/goals';
import { categoryPeriodProgress } from '@/features/azkar/data/category-progress';
import { periodKey, scopeKeyForCategory, type ScopeSummary } from '@/features/azkar/data/progress';

import { buildDailyProgress, type DailyProgressInput } from './daily-progress';

const allOn: DailyGoals = { misbahaTarget: 100, sessions: ['morning', 'evening'], wird: true };

function input(overrides: Partial<DailyProgressInput> = {}): DailyProgressInput {
  return {
    goals: allOn,
    misbahaToday: 0,
    sessions: [
      { completed: 0, done: false, id: 'morning', total: 24 },
      { completed: 0, done: false, id: 'evening', total: 24 },
    ],
    wird: { pagesToday: 0, todayTarget: 20 },
    ...overrides,
  };
}

describe('buildDailyProgress', () => {
  it('is empty with nothing chosen, and never shows a goal the user did not choose', () => {
    const progress = buildDailyProgress(input({ goals: NO_DAILY_GOALS }));

    expect(progress).toEqual({ percent: 0, rows: [] });
  });

  it('is empty with goals chosen but no data for them', () => {
    const progress = buildDailyProgress(input({ misbahaToday: null, sessions: [], wird: null }));

    expect(progress).toEqual({ percent: 0, rows: [] });
  });

  it('lists only the chosen sessions', () => {
    const progress = buildDailyProgress(input({ goals: { misbahaTarget: null, sessions: ['evening'], wird: false } }));

    expect(progress.rows.map((row) => row.key)).toEqual(['session:evening']);
  });

  it('shows a partial day as the mean of the chosen goals', () => {
    const progress = buildDailyProgress(
      input({
        misbahaToday: 50,
        sessions: [{ completed: 24, done: true, id: 'morning', total: 24 }],
        wird: { pagesToday: 5, todayTarget: 20 },
      }),
    );

    expect(progress.rows).toEqual([
      { completed: 5, done: false, fraction: 0.25, key: 'wird', kind: 'wird', total: 20 },
      { completed: 24, done: true, fraction: 1, key: 'session:morning', kind: 'session', sessionId: 'morning', total: 24 },
      { completed: 50, done: false, fraction: 0.5, key: 'misbaha', kind: 'misbaha', total: 100 },
    ]);
    // (0.25 + 1 + 0.5) / 3 with the evening session off.
    expect(progress.percent).toBe(58);
  });

  it('is 100 when every chosen goal is done', () => {
    const progress = buildDailyProgress(
      input({
        goals: { misbahaTarget: 33, sessions: ['morning'], wird: true },
        misbahaToday: 40,
        sessions: [{ completed: 24, done: true, id: 'morning', total: 24 }],
        wird: { pagesToday: 25, todayTarget: 20 },
      }),
    );

    expect(progress.percent).toBe(100);
    expect(progress.rows.every((row) => row.done)).toBe(true);
    // Counts past a goal are shown as they are; the fraction stops at 1.
    expect(progress.rows.map((row) => row.fraction)).toEqual([1, 1, 1]);
  });

  it('treats a wird with no pages asked for as done', () => {
    const progress = buildDailyProgress(input({ goals: { misbahaTarget: null, sessions: [], wird: true }, wird: { pagesToday: 0, todayTarget: 0 } }));

    expect(progress.rows[0]).toMatchObject({ done: true, fraction: 1 });
  });

  it('is empty for a session with no units, and never reads it as done', () => {
    const progress = buildDailyProgress(
      input({ goals: { misbahaTarget: null, sessions: ['morning'], wird: false }, sessions: [{ completed: 0, done: false, id: 'morning', total: 0 }] }),
    );

    expect(progress.rows[0]).toMatchObject({ done: false, fraction: 0 });
  });

  it('empties the day’s session progress on a new period (yesterday’s completion does not count today)', () => {
    const now = new Date(2026, 10, 1, 12, 0, 0);
    const yesterday = periodKey('daily', new Date(2026, 9, 31, 12, 0, 0));
    const summaries: ScopeSummary[] = [{ completedUnits: 24, periodKey: yesterday, scopeKey: scopeKeyForCategory('morning'), updatedAt: 1 }];
    const today = categoryPeriodProgress({ id: 'morning', progressPeriod: 'daily', unitCount: 24 }, summaries, now);

    const progress = buildDailyProgress(
      input({ goals: { misbahaTarget: null, sessions: ['morning'], wird: false }, sessions: [{ id: 'morning', ...today }] }),
    );

    expect(progress.rows[0]).toMatchObject({ completed: 0, done: false, fraction: 0 });
    expect(progress.percent).toBe(0);
  });
});
