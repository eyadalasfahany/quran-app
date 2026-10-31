import { completedUnitsIn, type ScopeSummary } from './progress';

const summaries: ScopeSummary[] = [
  { scopeKey: 'category:morning', periodKey: '2026-11-01', completedUnits: 4, updatedAt: 1 },
  { scopeKey: 'category:morning', periodKey: '2026-10-31', completedUnits: 9, updatedAt: 0 },
  { scopeKey: 'entry:fixture:entry-001', periodKey: 'session', completedUnits: 1, updatedAt: 2 },
];

describe('completedUnitsIn', () => {
  it('counts only the scope in the requested period', () => {
    expect(completedUnitsIn(summaries, 'category:morning', '2026-11-01')).toBe(4);
    expect(completedUnitsIn(summaries, 'category:morning', '2026-10-31')).toBe(9);
  });

  it('is zero for a scope with no rows in that period', () => {
    expect(completedUnitsIn(summaries, 'category:evening', '2026-11-01')).toBe(0);
    expect(completedUnitsIn([], 'category:morning', '2026-11-01')).toBe(0);
  });
});
