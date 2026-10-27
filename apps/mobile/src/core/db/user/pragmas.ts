import type { SqlExecutor } from '@/core/db/sql-executor';

export function configureUserDatabase(executor: SqlExecutor): void {
  executor.exec('PRAGMA journal_mode = WAL');
  executor.exec('PRAGMA foreign_keys = ON');
}
