import type { SqlExecutor } from '@/core/db/sql-executor';
import { openUserDb } from '@/core/db/user/open';

export function isNameFavourite(nameSlug: string, executor?: SqlExecutor): boolean {
  const db = executor ?? openUserDb().executor;
  try {
    return db.get<{ one: number }>('SELECT 1 AS one FROM names_favorites WHERE name_slug = ?', [nameSlug]) !== undefined;
  } catch {
    return false;
  }
}

export function toggleNameFavourite(nameSlug: string, executor?: SqlExecutor): boolean {
  const db = executor ?? openUserDb().executor;
  const now = Date.now();
  if (isNameFavourite(nameSlug, db)) {
    db.run('DELETE FROM names_favorites WHERE name_slug = ?', [nameSlug]);
    return false;
  }
  db.run('INSERT INTO names_favorites (name_slug, created_at) VALUES (?, ?)', [nameSlug, now]);
  return true;
}
