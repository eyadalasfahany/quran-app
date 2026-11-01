import { categoryPeriodProgress } from './category-progress';
import { periodKey, scopeKeyForCategory, type ScopeSummary } from './progress';

// Local noon, so the daily and nightly periods are unambiguous.
const now = new Date(2026, 10, 1, 12, 0, 0);
const today = periodKey('daily', now);
const yesterday = periodKey('daily', new Date(2026, 9, 31, 12, 0, 0));

function summary(periodKeyValue: string, completedUnits: number, categoryId = 'morning'): ScopeSummary {
  return { completedUnits, periodKey: periodKeyValue, scopeKey: scopeKeyForCategory(categoryId), updatedAt: 1 };
}

const morning = { id: 'morning', progressPeriod: 'daily' as const, unitCount: 4 };

describe('categoryPeriodProgress', () => {
  it('is empty when nothing is recorded for the current period', () => {
    expect(categoryPeriodProgress(morning, [], now)).toEqual({ completed: 0, done: false, total: 4 });
  });

  it('counts a partial day', () => {
    expect(categoryPeriodProgress(morning, [summary(today, 2)], now)).toEqual({ completed: 2, done: false, total: 4 });
  });

  it('is done when every unit of the current period is complete', () => {
    expect(categoryPeriodProgress(morning, [summary(today, 4)], now)).toEqual({ completed: 4, done: true, total: 4 });
  });

  it('starts again on a new day: yesterday’s completion does not count today', () => {
    expect(categoryPeriodProgress(morning, [summary(yesterday, 4)], now)).toEqual({ completed: 0, done: false, total: 4 });
  });

  it('never reports more than the total', () => {
    expect(categoryPeriodProgress(morning, [summary(today, 9)], now)).toEqual({ completed: 4, done: true, total: 4 });
  });

  it('is not done for a category with no units', () => {
    expect(categoryPeriodProgress({ ...morning, unitCount: 0 }, [], now)).toEqual({ completed: 0, done: false, total: 0 });
  });

  it('ignores other categories', () => {
    expect(categoryPeriodProgress(morning, [summary(today, 3, 'evening')], now)).toEqual({ completed: 0, done: false, total: 4 });
  });
});
