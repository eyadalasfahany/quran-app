import type { SqlExecutor } from '@/core/db/sql-executor';
import { normalizeForSearch } from '@/core/text/normalizeForSearch';

import { seedHisnFixture } from './hisn-dua-fixtures';

/**
 * Placeholder duas for the Duas data tests (ADR 0091). Every text says it is not a dua; nothing here is religious text.
 * The duas pack is resource 50; the Hisn fixture (azkar) is resource 7.
 */
export const DUAS_FIXTURE_RESOURCE_ID = 50;
export const HADITH_TEXT_1 = 'نص تجريبي ١ — إلى ليس دعاءً';
export const HADITH_TEXT_2 = 'نص تجريبي ٢ — بلا مجموعة';

/** Indexes every Azkar text segment the way the importer does: the normalised form in `text_search`. */
export function indexAzkarText(executor: SqlExecutor): void {
  const rows = executor.all<{ itemId: number; position: number; textAr: string }>(
    `SELECT item_id AS itemId, position, text_ar AS textAr FROM azkar_segments WHERE kind = 'text'`,
  );
  for (const row of rows) {
    executor.run(`UPDATE azkar_segments SET text_search = ? WHERE item_id = ? AND position = ?`, [
      normalizeForSearch(row.textAr),
      row.itemId,
      row.position,
    ]);
  }
}

/** One surah (number 1, named with placeholders) for the Quranic dua's name and reference. */
export function seedSurahFixture(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO chapters (id, name_arabic, name_simple, name_en, revelation_place, revelation_order, verses_count, bismillah_pre, page_start, page_end)
     VALUES (1, 'FIXTURE سورة ١', 'FIXTURE surah one', 'FIXTURE surah one', 'makkah', 1, 7, 0, 1, 1)`,
  );
}

/**
 * The duas pack: one Quranic dua (`quran:1:1`), a HadeethEnc group with two duas (`hadeethenc:1` in the group,
 * `hadeethenc:2` outside any group). Hadith text is indexed in `text_search`, as the importer does.
 */
export function seedDuasPackFixture(executor: SqlExecutor): void {
  const resourceId = DUAS_FIXTURE_RESOURCE_ID;
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'duas', 1, 'fixture', 0)`,
    [resourceId],
  );
  executor.run(`INSERT INTO dua_groups (resource_id, id, source_category_id, title, position) VALUES (?, 1, 1, 'FIXTURE group 1', 1)`, [
    resourceId,
  ]);
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position) VALUES
       (?, 1, 'quran:1:1', 'quran', NULL, 1),
       (?, 10, 'hadeethenc:1', 'hadith', 1, 2),
       (?, 11, 'hadeethenc:2', 'hadith', NULL, 3)`,
    [resourceId, resourceId, resourceId],
  );
  executor.run(`INSERT INTO dua_quran_spans (resource_id, item_id, surah, verse_from, verse_to) VALUES (?, 1, 1, 1, NULL)`, [resourceId]);
  executor.run(
    `INSERT INTO dua_hadith (resource_id, item_id, hadeeth_id, title, hadeeth, attribution, grade, explanation, reference, hints, text_search, source_url)
     VALUES (?, 10, 1, 'FIXTURE title 1', ?, 'FIXTURE attr', NULL, NULL, NULL, NULL, ?, 'https://example.test/1'),
            (?, 11, 2, 'FIXTURE title 2', ?, 'FIXTURE attr', NULL, NULL, NULL, NULL, ?, 'https://example.test/2')`,
    [
      resourceId,
      HADITH_TEXT_1,
      normalizeForSearch(HADITH_TEXT_1),
      resourceId,
      HADITH_TEXT_2,
      normalizeForSearch(HADITH_TEXT_2),
    ],
  );
}

/** Everything the Duas data tests read: the surah, the Hisn azkar pack (indexed), and the duas pack. */
export function seedDuasFixtures(executor: SqlExecutor): void {
  seedSurahFixture(executor);
  seedHisnFixture(executor);
  indexAzkarText(executor);
  seedDuasPackFixture(executor);
}

export const BUKHARI_FIXTURE_RESOURCE_ID = 60;
export const MUSLIM_FIXTURE_RESOURCE_ID = 61;

/**
 * Installs two hadith collection packs (Bukhari and Muslim, each with its own resource id) and the duas pack's
 * `dua_collection_books` rows (ADR 0091 part 4). Bukhari book 80 holds two hadith; book 81 is empty. Muslim book 48 has
 * no title, so it takes the fallback name. Muslim book 49 is empty. Every text is a placeholder. Needs the duas pack
 * (resource 50) installed first.
 */
export function seedHadithBookFixtures(executor: SqlExecutor): void {
  const bukhari = BUKHARI_FIXTURE_RESOURCE_ID;
  const muslim = MUSLIM_FIXTURE_RESOURCE_ID;
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at)
     VALUES (?, 'hadith_collections', 1, 'fixture', 0), (?, 'hadith_collections', 1, 'fixture', 0)`,
    [bukhari, muslim],
  );
  executor.run(
    `INSERT INTO hadith_collections (resource_id, id, slug, source_code, title_ar, title_en, attribution_ar, attribution_en, total_hadith, books_count)
     VALUES (?, 1, 'bukhari', 'fixture', 'FIXTURE collection', NULL, 'FIXTURE attr', 'FIXTURE attr', 2, 2),
            (?, 2, 'muslim', 'fixture', 'FIXTURE collection', NULL, 'FIXTURE attr', 'FIXTURE attr', 2, 2)`,
    [bukhari, muslim],
  );
  executor.run(
    `INSERT INTO hadith_books (resource_id, id, book_number, title_ar, title_en, position, hadith_count)
     VALUES (?, 1, '80', 'FIXTURE book title 80', NULL, 1, 2),
            (?, 2, '81', 'FIXTURE book title 81', NULL, 2, 0),
            (?, 3, '48', NULL, NULL, 1, 1),
            (?, 4, '49', 'FIXTURE book title 49', NULL, 2, 0)`,
    [bukhari, bukhari, muslim, muslim],
  );
  executor.run(
    `INSERT INTO hadith_entries (resource_id, id, book_id, chapter_id, hadith_number, position, text_ar, text_search)
     VALUES (?, 1, 1, NULL, '80.1', 1, 'FIXTURE hadith text 80.1 with  double  spaces ', 'fixture'),
            (?, 2, 1, NULL, '80.2', 2, 'FIXTURE hadith text 80.2', 'fixture'),
            (?, 3, 3, NULL, '48.1', 1, 'FIXTURE hadith text 48.1', 'fixture')`,
    [bukhari, bukhari, muslim],
  );
  executor.run(
    `INSERT INTO dua_collection_books (resource_id, id, collection_slug, book_number, position)
     VALUES (?, 1, 'bukhari', '80', 1),
            (?, 2, 'muslim', '48', 2),
            (?, 3, 'nasai', '50', 3),
            (?, 4, 'muslim', '49', 4),
            (?, 5, 'muslim', '99', 5)`,
    [DUAS_FIXTURE_RESOURCE_ID, DUAS_FIXTURE_RESOURCE_ID, DUAS_FIXTURE_RESOURCE_ID, DUAS_FIXTURE_RESOURCE_ID, DUAS_FIXTURE_RESOURCE_ID],
  );
}

/**
 * Two placeholder verses (1:1 and 1:2) for the Quranic dua fixtures, so a card's verse text can be read. The text is a
 * marked placeholder, never Quran.
 */
export function seedQuranVerseFixtures(executor: SqlExecutor): void {
  for (const verseNumber of [1, 2]) {
    executor.run(
      `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
       VALUES (?, ?, 1, ?, 1, 1, 1, 1, 'none', ?, 'fixture')`,
      [verseNumber, `1:${verseNumber}`, verseNumber, `FIXTURE verse 1:${verseNumber} — not Quran`],
    );
  }
}
