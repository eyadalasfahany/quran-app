import { openDatabaseSync } from 'expo-sqlite';

import { USER_DATABASE } from './constants';
import { openUserDb } from './open';

// jest.setup.ts replaces this module; this test exercises the real opener.
jest.unmock('@/core/db/user/open');

jest.mock('expo-sqlite', () => ({ openDatabaseSync: jest.fn(() => ({})) }));
jest.mock('drizzle-orm/expo-sqlite', () => ({ drizzle: jest.fn(() => ({})) }));
jest.mock('@/core/db/expo-sql-executor', () => ({ createExpoSqlExecutor: jest.fn(() => ({})) }));
jest.mock('./pragmas', () => ({ configureUserDatabase: jest.fn() }));

describe('openUserDb', () => {
  it('enables the change listener, so live queries re-run after a write', () => {
    openUserDb();

    expect(openDatabaseSync).toHaveBeenCalledWith(USER_DATABASE, { enableChangeListener: true });
  });
});
