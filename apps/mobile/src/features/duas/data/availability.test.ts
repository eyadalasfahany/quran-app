import type { SqlExecutor } from '@/core/db/sql-executor';

import { hasDuasContent, hasPropheticDuas, hasQuranicDuas } from './availability';

describe('hasDuasContent', () => {
  it('is false when the dua_items table is missing', () => {
    const db = {
      get: () => {
        throw new Error('no such table: dua_items');
      },
    } as unknown as SqlExecutor;

    expect(hasDuasContent(db)).toBe(false);
  });

  it('is true when at least one row exists', () => {
    const db = {
      get: () => ({ one: 1 }),
    } as unknown as SqlExecutor;

    expect(hasDuasContent(db)).toBe(true);
  });

  it('hasQuranicDuas is false when the table is missing', () => {
    const db = {
      get: () => {
        throw new Error('no such table');
      },
    } as unknown as SqlExecutor;

    expect(hasQuranicDuas(db)).toBe(false);
  });

  it('hasPropheticDuas is false when count is zero', () => {
    const db = {
      get: () => ({ count: 0 }),
    } as unknown as SqlExecutor;

    expect(hasPropheticDuas(db)).toBe(false);
  });

  it('is false when the table is empty', () => {
    const db = {
      get: () => undefined,
    } as unknown as SqlExecutor;

    expect(hasDuasContent(db)).toBe(false);
  });
});
