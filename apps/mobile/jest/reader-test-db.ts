import { join } from 'node:path';

import { importSeedIfNeeded } from '@/core/db/content/seed';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { applyContentMigrations } from './apply-content-migrations';
import { openNodeSqlite } from './node-sqlite-executor';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const seedPath = join(process.cwd(), 'assets/db/tanzil-seed.db');

export async function openReaderTestContent(): Promise<{ executor: SqlExecutor }> {
  const opened = openNodeSqlite(':memory:');
  applyContentMigrations(opened.executor, migrationsDir);
  await importSeedIfNeeded(opened.executor, { path: () => seedPath });
  return { executor: opened.executor };
}
