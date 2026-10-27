import type { SQLiteDatabase } from 'expo-sqlite';

import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

export function createExpoSqlExecutor(database: SQLiteDatabase): SqlExecutor {
  return {
    exec(sql) {
      database.execSync(sql);
    },
    run(sql, params = []) {
      database.runSync(sql, bind(params));
    },
    get<T>(sql: string, params: readonly SqlValue[] = []) {
      const row = database.getFirstSync<T>(sql, bind(params));
      return row ?? undefined;
    },
    all<T>(sql: string, params: readonly SqlValue[] = []) {
      return database.getAllSync<T>(sql, bind(params));
    },
    transaction<T>(fn: () => T) {
      let result: T | undefined;
      database.withTransactionSync(() => {
        result = fn();
      });
      return result as T;
    },
  };
}

function bind(params: readonly SqlValue[]): SqlValue[] {
  return [...params];
}
