import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';

import { configureUserDatabase } from '@/core/db/user/pragmas';
import type { UserStore } from '@/features/library/data';

import { applyContentMigrations } from './apply-content-migrations';
import { openNodeSqlite } from './node-sqlite-executor';

const migrationsDir = join(process.cwd(), 'src/core/db/user/migrations');

// A migrated in-memory user.db for component tests that write through the step 3 repository.
export function openUserTestStore(): { database: DatabaseSync; store: UserStore } {
  const opened = openNodeSqlite(':memory:');
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, migrationsDir);
  let tick = 1_700_000_000_000;
  let id = 0;
  return {
    database: opened.database,
    store: {
      db: opened.executor,
      now: () => (tick += 1),
      uuid: () => `00000000-0000-4000-8000-${String((id += 1)).padStart(12, '0')}`,
    },
  };
}
