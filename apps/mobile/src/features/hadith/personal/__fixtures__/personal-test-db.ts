import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb, openAzkarUserDb } from '../../../../../jest/azkar-test-db';
import { loadHadithDevFixtures } from '../../data/__fixtures__/dev-fixtures';
import type { HadithNumberResolver } from '../model';

/**
 * TEST ONLY. In-memory user.db and content.db for the personal hadith suites. Every Arabic text is a marked placeholder
 * («نص تجريبي — ليس حديثًا»). No production code may import this module.
 */

export const PLACEHOLDER_TEXT_AR = 'نص تجريبي — ليس حديثًا';
export const PLACEHOLDER_TEXT_SEARCH = 'نص تجريبي';

export type PersonalDbs = { user: SqlExecutor; content: SqlExecutor; close(): void };

export function openPersonalDbs(): PersonalDbs {
  const user = openAzkarUserDb();
  const content = openAzkarContentDb();
  loadHadithDevFixtures(content.executor);
  return {
    user: user.executor,
    content: content.executor,
    close() {
      user.database.close();
      content.database.close();
    },
  };
}

export function addEntry(
  content: SqlExecutor,
  input: {
    resourceId: number;
    id: number;
    bookId: number;
    hadithNumber: string;
    position: number;
    numberFirst?: string | null;
    numberLast?: string | null;
    sourceCode?: string | null;
  },
): void {
  content.run(
    `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, arabic_number, position, text_ar, text_en, narrator_en, text_search, source_url, number_first, number_last, source_code)
     VALUES (?, ?, ?, NULL, ?, NULL, ?, ?, NULL, NULL, ?, NULL, ?, ?, ?)`,
    [
      input.resourceId,
      input.id,
      input.bookId,
      input.hadithNumber,
      input.position,
      PLACEHOLDER_TEXT_AR,
      PLACEHOLDER_TEXT_SEARCH,
      input.numberFirst ?? null,
      input.numberLast ?? null,
      input.sourceCode ?? null,
    ],
  );
}

export function addAlias(
  content: SqlExecutor,
  input: {
    resourceId: number;
    oldNumber: string;
    newNumber: string | null;
    match: string;
    sinceVersion: number;
  },
): void {
  content.run(
    `INSERT INTO hadith_ref_aliases (resource_id, old_number, new_number, match, since_version) VALUES (?, ?, ?, ?, ?)`,
    [input.resourceId, input.oldNumber, input.newNumber, input.match, input.sinceVersion],
  );
}

export function mergeResolver(map: Record<string, string>): HadithNumberResolver {
  return (_content, _slug, hadithNumber) => map[hadithNumber] ?? null;
}

export function fixedNow(value: number): () => number {
  return () => value;
}
