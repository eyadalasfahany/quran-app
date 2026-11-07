import type { SqlExecutor } from '@/core/db/sql-executor';

import { getHadith, hadithResourceId } from '../data';
import type { AliasApplyResult } from './model';

type AliasRow = { newNumber: string | null; match: string; sinceVersion: number };

type ItemRow = { collectionSlug: string; hadithNumber: string; bookNumber: string; aliasVersion: number };

type Outcome = 'none' | 'rewritten' | 'unverified';

/** Highest `since_version` in `hadith_ref_aliases` for the collection, 0 when the collection or the table has none. */
export function currentAliasVersion(content: SqlExecutor | undefined, slug: string): number {
  if (content === undefined) {
    return 0;
  }
  try {
    const resourceId = hadithResourceId(content, slug);
    if (resourceId === undefined) {
      return 0;
    }
    const row = content.get<{ version: number | null }>(
      'SELECT MAX(since_version) AS version FROM hadith_ref_aliases WHERE resource_id = ?',
      [resourceId],
    );
    return row?.version ?? 0;
  } catch {
    return 0;
  }
}

function aliasTableReadable(content: SqlExecutor): boolean {
  try {
    content.get('SELECT 1 AS one FROM hadith_ref_aliases LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Follows the aliases of one item. An `exact_text` alias with a new number moves the item and the loop continues (a later
 * switch may move it again). Any other match stops at the current number and marks the item unverified.
 */
function followAliases(
  content: SqlExecutor,
  resourceId: number,
  item: ItemRow,
): { number: string; version: number; outcome: Outcome } {
  let number = item.hadithNumber;
  let version = item.aliasVersion;
  let outcome: Outcome = 'none';

  for (;;) {
    const alias = content.get<AliasRow>(
      `SELECT new_number AS newNumber, match, since_version AS sinceVersion
       FROM hadith_ref_aliases
       WHERE resource_id = ? AND old_number = ? AND since_version > ?
       ORDER BY since_version ASC
       LIMIT 1`,
      [resourceId, number, version],
    );
    if (alias === undefined) {
      break;
    }
    version = alias.sinceVersion;
    if (alias.match === 'exact_text' && alias.newNumber !== null) {
      number = alias.newNumber;
      outcome = 'rewritten';
      continue;
    }
    outcome = 'unverified';
    break;
  }

  return { number, version, outcome };
}

function bookNumberFor(content: SqlExecutor, slug: string, number: string, savedBookNumber: string): string {
  return getHadith(content, slug, number)?.book.bookNumber ?? savedBookNumber;
}

function applyToBookmark(user: SqlExecutor, content: SqlExecutor, item: ItemRow, result: AliasApplyResult): void {
  const resourceId = hadithResourceId(content, item.collectionSlug);
  if (resourceId === undefined) {
    result.unchanged += 1;
    return;
  }
  const { number, version, outcome } = followAliases(content, resourceId, item);
  if (outcome === 'none') {
    result.unchanged += 1;
    return;
  }

  const moved = number !== item.hadithNumber;
  const bookNumber = moved ? bookNumberFor(content, item.collectionSlug, number, item.bookNumber) : item.bookNumber;
  const unverified = outcome === 'unverified' ? 1 : 0;

  // A row already saved under the new number wins: the old row goes and the existing one stays as it is.
  const targetExists =
    moved &&
    user.get<{ one: number }>(
      'SELECT 1 AS one FROM hadith_bookmarks WHERE collection_slug = ? AND hadith_number = ?',
      [item.collectionSlug, number],
    ) !== undefined;

  if (targetExists) {
    user.run('DELETE FROM hadith_bookmarks WHERE collection_slug = ? AND hadith_number = ?', [
      item.collectionSlug,
      item.hadithNumber,
    ]);
  } else {
    user.run(
      `UPDATE hadith_bookmarks SET hadith_number = ?, book_number = ?, unverified = ?, alias_version = ?
       WHERE collection_slug = ? AND hadith_number = ?`,
      [number, bookNumber, unverified, version, item.collectionSlug, item.hadithNumber],
    );
  }

  if (outcome === 'unverified') {
    result.unverified += 1;
  } else {
    result.rewritten += 1;
  }
}

function applyToPlace(user: SqlExecutor, content: SqlExecutor, item: ItemRow, result: AliasApplyResult): void {
  const resourceId = hadithResourceId(content, item.collectionSlug);
  if (resourceId === undefined) {
    result.unchanged += 1;
    return;
  }
  const { number, version, outcome } = followAliases(content, resourceId, item);
  if (outcome === 'none') {
    result.unchanged += 1;
    return;
  }

  const moved = number !== item.hadithNumber;
  const bookNumber = moved ? bookNumberFor(content, item.collectionSlug, number, item.bookNumber) : item.bookNumber;
  const unverified = outcome === 'unverified' ? 1 : 0;

  user.run(
    `UPDATE hadith_reading_position SET hadith_number = ?, book_number = ?, unverified = ?, alias_version = ?
     WHERE collection_slug = ?`,
    [number, bookNumber, unverified, version, item.collectionSlug],
  );

  if (outcome === 'unverified') {
    result.unverified += 1;
  } else {
    result.rewritten += 1;
  }
}

/**
 * ADR 0042 §8, plan open question 14. Applies `hadith_ref_aliases` of `content` to the saved hadith and the reading
 * places of `user`. Safe to call on every start: with no alias rows it reads and writes nothing. Not called by any
 * app code in this step (step 13 or 18 wires it; Open question 2).
 */
export function applyHadithAliases(user: SqlExecutor, content: SqlExecutor): AliasApplyResult {
  const result: AliasApplyResult = { rewritten: 0, unverified: 0, unchanged: 0 };
  if (!aliasTableReadable(content)) {
    return result;
  }

  // One transaction for the whole run; the helpers below never open their own.
  return user.transaction(() => {
    const bookmarks = user.all<ItemRow>(
      `SELECT collection_slug AS collectionSlug, hadith_number AS hadithNumber, book_number AS bookNumber,
              alias_version AS aliasVersion
       FROM hadith_bookmarks WHERE unverified = 0
       ORDER BY collection_slug, hadith_number`,
    );
    for (const item of bookmarks) {
      applyToBookmark(user, content, item, result);
    }

    const places = user.all<ItemRow>(
      `SELECT collection_slug AS collectionSlug, hadith_number AS hadithNumber, book_number AS bookNumber,
              alias_version AS aliasVersion
       FROM hadith_reading_position WHERE unverified = 0
       ORDER BY collection_slug`,
    );
    for (const item of places) {
      applyToPlace(user, content, item, result);
    }

    return result;
  });
}
