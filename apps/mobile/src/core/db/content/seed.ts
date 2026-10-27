import type { SqlExecutor } from '@/core/db/sql-executor';

import {
  CHAPTER_COLUMNS,
  META_COLUMNS,
  VERSE_COLUMNS,
  WORD_COLUMNS,
  insertFromAttached,
} from './seed-schema';

export type SeedSource = {
  path: () => string | Promise<string>;
};

const SEED_SCHEMA = 'seed';

export async function importSeedIfNeeded(db: SqlExecutor, seed: SeedSource): Promise<void> {
  const bundled = db.get<{ value: string }>('SELECT value FROM meta WHERE key = ?', ['bundled_text']);
  if (bundled?.value) {
    return;
  }

  const existing = db.get<{ count: number }>('SELECT count(*) AS count FROM verses');
  if (existing !== undefined && existing.count > 0) {
    return;
  }

  const path = await seed.path();
  db.exec(`ATTACH DATABASE ${sqlString(path)} AS ${SEED_SCHEMA}`);

  try {
    db.transaction(() => {
      db.exec(insertFromAttached('chapters', CHAPTER_COLUMNS, SEED_SCHEMA));
      db.exec(insertFromAttached('verses', VERSE_COLUMNS, SEED_SCHEMA));
      db.exec(insertFromAttached('words', WORD_COLUMNS, SEED_SCHEMA));
      db.exec('INSERT INTO search_quran (verse_id, text_search) SELECT id, text_search FROM verses');
      db.exec(insertFromAttached('meta', META_COLUMNS, SEED_SCHEMA));
    });
  } finally {
    db.exec(`DETACH DATABASE ${SEED_SCHEMA}`);
  }
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
