import type { SqlExecutor } from '@/core/db/sql-executor';

import { hasNamesContent } from './availability';

describe('hasNamesContent', () => {
  it('is false when the names table is missing', () => {
    const db = {
      get: () => {
        throw new Error('no such table: names');
      },
    } as unknown as SqlExecutor;

    expect(hasNamesContent(db)).toBe(false);
  });

  it('is true when at least one row exists', () => {
    const db = {
      get: () => ({ one: 1 }),
    } as unknown as SqlExecutor;

    expect(hasNamesContent(db)).toBe(true);
  });
});
