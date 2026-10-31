import { join } from 'node:path';

import { configureUserDatabase } from '@/core/db/user/pragmas';

import { applyContentMigrations } from './apply-content-migrations';
import { openNodeSqlite } from './node-sqlite-executor';

/** An in-memory `content.db` with every content migration applied (azkar tables included). */
export function openAzkarContentDb() {
  const opened = openNodeSqlite(':memory:');
  applyContentMigrations(opened.executor, join(process.cwd(), 'src/core/db/content/migrations'));
  return opened;
}

/** An in-memory `user.db` with every user migration applied (azkar personal tables included). */
export function openAzkarUserDb() {
  const opened = openNodeSqlite(':memory:');
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, join(process.cwd(), 'src/core/db/user/migrations'));
  return opened;
}

/** An element that must exist: fails the test with a clear message rather than returning undefined. */
export function at<T>(list: readonly T[], index: number): T {
  const value = list[index];
  if (value === undefined) {
    throw new Error(`Expected an element at index ${index}, found ${list.length}.`);
  }
  return value;
}
