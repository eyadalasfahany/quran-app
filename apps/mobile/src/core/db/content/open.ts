import { drizzle, type ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { defaultDatabaseDirectory, importDatabaseFromAssetAsync, openDatabaseSync } from 'expo-sqlite';
import { useEffect, useLayoutEffect, useState } from 'react';

import seedAsset from '@/assets/db/tanzil-seed.db';
import type { SqlExecutor } from '@/core/db/sql-executor';

import { createExpoSqlExecutor } from '../expo-sql-executor';
import { publishContentReady, useContentReady, type ContentReadyState } from './content-ready';
import * as schema from './schema';
import { importSeedIfNeeded, type SeedSource } from './seed';
import migrations from './migrations/migrations.js';

const CONTENT_DATABASE = 'content.db';
const SEED_DATABASE = 'tanzil-seed.db';

type OpenedContentDb = {
  db: ExpoSQLiteDatabase<typeof schema>;
  executor: SqlExecutor;
};

let opened: OpenedContentDb | null = null;
let seedImport: Promise<void> | null = null;

const bundledSeed: SeedSource = {
  async path() {
    await importDatabaseFromAssetAsync(SEED_DATABASE, { assetId: seedAsset, forceOverwrite: true });
    return seedDatabasePath();
  },
};

export function openContentDb(): OpenedContentDb {
  if (opened) {
    return opened;
  }

  const sqlite = openDatabaseSync(CONTENT_DATABASE);
  sqlite.execSync('PRAGMA journal_mode = WAL');
  sqlite.execSync('PRAGMA foreign_keys = ON');

  opened = {
    db: drizzle(sqlite, { schema }),
    executor: createExpoSqlExecutor(sqlite),
  };

  return opened;
}

/**
 * Runs the content migrations and the seed import, once. Only the root layout calls it; it publishes the result, and
 * every other component reads it with `useContentDb`. Running it per component ran the migrations once per hook.
 */
export function useContentDbBootstrap(): ContentReadyState {
  const content = openContentDb();
  const migration = useMigrations(content.db, migrations);
  const [seedReady, setSeedReady] = useState(false);
  const [seedError, setSeedError] = useState<Error | null>(null);

  useEffect(() => {
    if (!migration.success) {
      return;
    }

    let cancelled = false;

    importBundledSeed(content.executor)
      .then(() => {
        if (!cancelled) {
          setSeedReady(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSeedError(error instanceof Error ? error : new Error('Could not import the Tanzil seed.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [content.executor, migration.success]);

  const error = migration.error ?? seedError ?? null;
  const ready = migration.success && seedReady;

  // Before paint, so the components that mount with the root already read the published state.
  useLayoutEffect(() => {
    publishContentReady({ ready, error });
  }, [ready, error]);

  return { ready, error };
}

/** The shared readiness of `content.db`, published by the root's `useContentDbBootstrap`. */
export function useContentDb(): ContentReadyState {
  const ready = useContentReady((state) => state.ready);
  const error = useContentReady((state) => state.error);
  return { error, ready };
}

function importBundledSeed(executor: SqlExecutor): Promise<void> {
  seedImport ??= importSeedIfNeeded(executor, bundledSeed).catch((error: unknown) => {
    seedImport = null;
    throw error;
  });

  return seedImport;
}

function seedDatabasePath(): string {
  if (typeof defaultDatabaseDirectory !== 'string' || defaultDatabaseDirectory.length === 0) {
    throw new Error('SQLite default directory is unavailable.');
  }

  return `${defaultDatabaseDirectory.replace(/\/+$/, '')}/${SEED_DATABASE}`;
}
