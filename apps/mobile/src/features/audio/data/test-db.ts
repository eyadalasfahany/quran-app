import { join } from 'node:path';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');

/** An in-memory content.db at the current migrations. Test-only. */
export function openAudioTestDb(): { executor: SqlExecutor; close: () => void } {
  const { database, executor } = openNodeSqlite(':memory:');
  applyContentMigrations(executor, migrationsDir);
  return { executor, close: () => database.close() };
}
