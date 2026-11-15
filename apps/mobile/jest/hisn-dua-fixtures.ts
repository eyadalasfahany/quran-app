import type { SqlExecutor } from '@/core/db/sql-executor';

/**
 * Installs one azkar resource shaped for the Hisn duas tests (ADR 0091). Every text is a placeholder, never a dua.
 *
 * Layout:
 * - `session-x` (session): e4 (not a dua) and e5 (`home = 'duas'`, but in a session, so it stays in Azkar).
 * - `browse-a` (position 1): e1 and e2, both Hisn duas.
 * - `browse-b` (position 2): e1 (the same dua as in `browse-a`) and e3 (not a dua).
 * - `browse-c` (position 3): e5 only, which is in a session, so the topic has no Hisn duas.
 * - `browse-d` (position 4): e7 only, not a dua.
 * - `browse-empty` (position 5): no entries.
 *
 * Entry e1 has a Quran segment (surah 1, verses 2 to 4); the segment has no text, as Quran segments never do here.
 */
export const HISN_FIXTURE_RESOURCE_ID = 7;

export const HISN_FIXTURE_TOPICS_WITH_DUAS = ['browse-a', 'browse-b'] as const;

export function seedHisnFixture(executor: SqlExecutor, resourceId = HISN_FIXTURE_RESOURCE_ID): void {
  const run = (sql: string, params: (string | number | null)[] = []) => executor.run(sql, [resourceId, ...params]);

  run(`INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'azkar', 1, 'fixture', 0)`, []);

  run(
    `INSERT INTO azkar_chapters (resource_id, id, source_chapter_id, number, title_ar, title_en) VALUES (?, 1, 'FIXTURE-CH-1', 1, 'FIXTURE chapter 1', 'FIXTURE chapter one')`,
  );
  run(
    `INSERT INTO azkar_chapters (resource_id, id, source_chapter_id, number, title_ar, title_en) VALUES (?, 2, 'FIXTURE-CH-2', 2, 'FIXTURE chapter 2', NULL)`,
  );

  // id, entry_key, chapter_id, position, source_reference, home
  const entries: [number, string, number, number, string, string | null][] = [
    [1, 'FIXTURE:entry-1', 1, 1, 'FIXTURE-REF-1', 'duas'],
    [2, 'FIXTURE:entry-2', 1, 2, 'FIXTURE-REF-2', 'duas'],
    [3, 'FIXTURE:entry-3', 2, 1, 'FIXTURE-REF-3', null],
    [4, 'FIXTURE:entry-4', 2, 2, 'FIXTURE-REF-4', null],
    [5, 'FIXTURE:entry-5', 2, 3, 'FIXTURE-REF-5', 'duas'],
    [7, 'FIXTURE:entry-7', 2, 4, 'FIXTURE-REF-7', null],
  ];

  for (const [id, key, chapter, position, reference, home] of entries) {
    run(
      `INSERT INTO azkar_entries (resource_id, id, entry_key, chapter_id, position, source_reference, entry_type, occasion,
         timing_type, timing_prayer, review_status, source_version, imported_at, home)
       VALUES (?, ?, ?, ?, ?, ?, 'invocation', NULL, NULL, NULL, 'sourced', 'fixture', 0, ?)`,
      [id, key, chapter, position, reference, home],
    );
    run(
      `INSERT INTO azkar_items (resource_id, id, entry_id, item_key, variation_key, position, kind, required_count)
       VALUES (?, ?, ?, ?, 'default', 1, 'recitation', NULL)`,
      [id, id, `FIXTURE:item-${id}`],
    );
    run(
      `INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
       VALUES (?, ?, 1, 'text', ?, NULL, NULL, NULL, NULL)`,
      [id, `FIXTURE text ${id} — not a dua`],
    );
  }

  // e1 opens with its text and then a Quran passage (surah 1, verses 2 to 4).
  run(
    `INSERT INTO azkar_segments (resource_id, item_id, position, kind, text_ar, quran_surah, quran_verse_from, quran_verse_to, text_search)
     VALUES (?, 1, 2, 'quran', NULL, 1, 2, 4, NULL)`,
  );

  const categories: [string, string, number, string][] = [
    // id, kind, position, progress_period
    ['session-x', 'session', 0, 'daily'],
    ['browse-a', 'browse', 1, 'session'],
    ['browse-b', 'browse', 2, 'session'],
    ['browse-c', 'browse', 3, 'session'],
    ['browse-d', 'browse', 4, 'session'],
    ['browse-empty', 'browse', 5, 'session'],
  ];
  for (const [id, kind, position, period] of categories) {
    run(`INSERT INTO azkar_categories (resource_id, id, kind, position, occasion, progress_period) VALUES (?, ?, ?, ?, NULL, ?)`, [
      id,
      kind,
      position,
      period,
    ]);
  }

  const links: [string, number][] = [
    ['session-x', 4],
    ['session-x', 5],
    ['browse-a', 1],
    ['browse-a', 2],
    ['browse-b', 1],
    ['browse-b', 3],
    ['browse-c', 5],
    ['browse-d', 7],
  ];
  links.forEach(([category, entry], index) => {
    run(
      `INSERT INTO azkar_entry_categories (resource_id, category_id, entry_id, variation_key, position) VALUES (?, ?, ?, '*', ?)`,
      [category, entry, index + 1],
    );
  });
}
