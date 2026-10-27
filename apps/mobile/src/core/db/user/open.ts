import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import { createExpoSqlExecutor } from '@/core/db/expo-sql-executor';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { USER_DATABASE } from './constants';
import migrations from './migrations/migrations.js';
import { configureUserDatabase } from './pragmas';
import * as schema from './schema';

export type UserDatabase = ExpoSQLiteDatabase<typeof schema>;

type OpenedUserDb = {
  db: UserDatabase;
  executor: SqlExecutor;
};

let opened: OpenedUserDb | null = null;

export function openUserDb(): OpenedUserDb {
  if (opened) {
    return opened;
  }

  const sqlite = openDatabaseSync(USER_DATABASE);
  const executor = createExpoSqlExecutor(sqlite);
  configureUserDatabase(executor);

  opened = {
    db: drizzle(sqlite, { schema }),
    executor,
  };

  return opened;
}

export function useUserDb(): { ready: boolean; error: Error | null } {
  const user = openUserDb();
  const migration = useMigrations(user.db, migrations);

  return {
    ready: migration.success,
    error: migration.error ?? null,
  };
}
