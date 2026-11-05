import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { listDuaFavoriteCards } from './favorite-cards';

const TITLE = 'FIXTURE title 1 — not a dua';

function seed(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at)
     VALUES (50, 'duas', 1, 'fixture', 0)`,
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (50, 1, 'quran:1:1', 'quran', NULL, 1),
            (50, 10, 'hadeethenc:1', 'hadith', NULL, 2)`,
  );
  executor.run(
    `INSERT INTO dua_quran_spans (resource_id, item_id, surah, verse_from, verse_to)
     VALUES (50, 1, 1, 1, NULL)`,
  );
  executor.run(
    `INSERT INTO dua_hadith (resource_id, item_id, hadeeth_id, title, hadeeth, attribution, grade, explanation, reference, hints, text_search, source_url)
     VALUES (50, 10, 1, ?, 'FIXTURE text 1 — not a dua', 'FIXTURE attr', NULL, NULL, NULL, NULL, 'fixture', 'https://example.test/1')`,
    [TITLE],
  );
}

const reference = (ref: { surah: number; verseFrom: number; verseTo: number } | null) =>
  ref === null ? null : `FIXTURE ref ${ref.surah}:${ref.verseFrom}-${ref.verseTo}`;

describe('listDuaFavoriteCards', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    seed(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('gives a Quranic dua its surah and verses, with no text preview', () => {
    const [card] = listDuaFavoriteCards(executor, [{ duaKey: 'quran:1:1' }], reference);
    expect(card).toEqual({ duaKey: 'quran:1:1', kind: 'quran', preview: null, quranReference: 'FIXTURE ref 1:1-1' });
  });

  it('gives a prophetic dua its title as the preview, with no reference', () => {
    const [card] = listDuaFavoriteCards(executor, [{ duaKey: 'hadeethenc:1' }], reference);
    expect(card).toEqual({ duaKey: 'hadeethenc:1', kind: 'hadith', preview: TITLE, quranReference: null });
  });

  it('keeps the order given and skips a favourite whose row is gone', () => {
    const cards = listDuaFavoriteCards(
      executor,
      [{ duaKey: 'hadeethenc:1' }, { duaKey: 'quran:9:9' }, { duaKey: 'quran:1:1' }],
      reference,
    );
    expect(cards.map((card) => card.duaKey)).toEqual(['hadeethenc:1', 'quran:1:1']);
  });

  it('gives a null reference when the reference label cannot be built', () => {
    const [card] = listDuaFavoriteCards(executor, [{ duaKey: 'quran:1:1' }], () => null);
    expect(card?.quranReference).toBeNull();
  });
});
