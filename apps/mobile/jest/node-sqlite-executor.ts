import { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

export function openNodeSqlite(path: string): { database: DatabaseSync; executor: SqlExecutor } {
  const database = new DatabaseSync(path);
  database.exec('PRAGMA foreign_keys = ON');

  return { database, executor: createNodeSqliteExecutor(database) };
}

export function createNodeSqliteExecutor(database: DatabaseSync): SqlExecutor {
  return {
    exec(sql) {
      database.exec(sql);
    },
    run(sql, params = []) {
      database.prepare(sql).run(...params);
    },
    get<T>(sql: string, params: readonly SqlValue[] = []) {
      return database.prepare(sql).get(...params) as T | undefined;
    },
    all<T>(sql: string, params: readonly SqlValue[] = []) {
      return database.prepare(sql).all(...params) as T[];
    },
    transaction<T>(fn: () => T) {
      database.exec('BEGIN');
      try {
        const result = fn();
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
