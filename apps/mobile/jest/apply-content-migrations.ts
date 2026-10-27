import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SqlExecutor } from '@/core/db/sql-executor';

type Journal = {
  entries: { idx: number; tag: string }[];
};

export function applyContentMigrations(executor: SqlExecutor, migrationsDir: string): void {
  const journal = JSON.parse(readFileSync(join(migrationsDir, 'meta/_journal.json'), 'utf8')) as Journal;
  const entries = [...journal.entries].sort((left, right) => left.idx - right.idx);

  for (const entry of entries) {
    executor.exec(readFileSync(join(migrationsDir, `${entry.tag}.sql`), 'utf8'));
  }
}
