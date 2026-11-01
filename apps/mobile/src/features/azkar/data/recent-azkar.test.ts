import { buildRecentAzkarEntries } from './recent-azkar';
import type { RecentScope } from './recent-scopes';
import type { ResolvedAzkarScope } from './scope-resolver';
import type { ScopeSummary } from './progress';

function resolved(scopeKey: string, total: number, periodKey = 'session'): ResolvedAzkarScope {
  return { categoryId: null, entryKey: scopeKey.slice('entry:'.length), occasion: null, periodKey, scopeKey, total };
}

const resolve = (scopeKey: string): ResolvedAzkarScope | null => {
  if (scopeKey === 'entry:fixture-a') return resolved(scopeKey, 3);
  if (scopeKey === 'entry:fixture-b') return resolved(scopeKey, 2);
  return null;
};

describe('buildRecentAzkarEntries', () => {
  it('keeps the history order and drops scopes whose content no longer resolves', () => {
    const scopes: RecentScope[] = [
      { openedAt: 30, scopeKey: 'entry:gone' },
      { openedAt: 20, scopeKey: 'entry:fixture-b' },
      { openedAt: 10, scopeKey: 'entry:fixture-a' },
    ];

    const rows = buildRecentAzkarEntries(scopes, resolve, []);

    expect(rows.map((row) => row.scope.scopeKey)).toEqual(['entry:fixture-b', 'entry:fixture-a']);
    expect(rows.map((row) => row.openedAt)).toEqual([20, 10]);
  });

  it('reports the progress of the current period and whether the scope is done', () => {
    const summaries: ScopeSummary[] = [
      { completedUnits: 2, periodKey: 'session', scopeKey: 'entry:fixture-a', updatedAt: 1 },
      { completedUnits: 9, periodKey: 'session', scopeKey: 'entry:fixture-b', updatedAt: 1 },
    ];

    const rows = buildRecentAzkarEntries(
      [
        { openedAt: 2, scopeKey: 'entry:fixture-a' },
        { openedAt: 1, scopeKey: 'entry:fixture-b' },
      ],
      resolve,
      summaries,
    );

    expect(rows[0]).toMatchObject({ completed: 2, done: false, total: 3 });
    // Never more than the total.
    expect(rows[1]).toMatchObject({ completed: 2, done: true, total: 2 });
  });

  it('ignores progress recorded for a period that is no longer current', () => {
    const rows = buildRecentAzkarEntries(
      [{ openedAt: 1, scopeKey: 'entry:fixture-a' }],
      (scopeKey) => resolved(scopeKey, 3, '2026-11-01'),
      [{ completedUnits: 3, periodKey: '2026-10-31', scopeKey: 'entry:fixture-a', updatedAt: 1 }],
    );

    expect(rows[0]).toMatchObject({ completed: 0, done: false });
  });

  it('returns nothing for an empty history', () => {
    expect(buildRecentAzkarEntries([], resolve, [])).toEqual([]);
  });
});
