import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import type { QuranPreviewRef } from '@/features/azkar/data';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { seedDuasFixtures } from '../../../../jest/duas-pack-fixtures';
import { listDuaFavoriteList } from './favorite-cards';

const single = (ref: QuranPreviewRef | null) => (ref === null ? null : `FIXTURE ref ${ref.surah}:${ref.verseFrom}-${ref.verseTo}`);
const many = (refs: readonly QuranPreviewRef[]) => (refs.length === 0 ? null : refs.map((ref) => single(ref)).join(' · '));

describe('listDuaFavoriteList', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    seedDuasFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  const list = (duaFavorites: { duaKey: string; createdAt: number }[], hisnFavorites: { entryKey: string; createdAt: number }[]) =>
    listDuaFavoriteList(executor, duaFavorites, hisnFavorites, single, many);

  it('lists both kinds newest first across them', () => {
    const cards = list(
      [
        { duaKey: 'quran:1:1', createdAt: 100 },
        { duaKey: 'hadeethenc:1', createdAt: 300 },
      ],
      [{ entryKey: 'FIXTURE:entry-1', createdAt: 200 }],
    );

    expect(cards.map((card) => (card.kind === 'hisn' ? card.entryKey : card.duaKey))).toEqual([
      'hadeethenc:1',
      'FIXTURE:entry-1',
      'quran:1:1',
    ]);
  });

  it('gives a Hisn dua its first Arabic text and its Quran references, and never a verse text for a Quranic dua', () => {
    const cards = list([{ duaKey: 'quran:1:1', createdAt: 1 }], [{ entryKey: 'FIXTURE:entry-1', createdAt: 2 }]);

    expect(cards[0]).toEqual({
      kind: 'hisn',
      entryKey: 'FIXTURE:entry-1',
      preview: 'FIXTURE text 1 — not a dua',
      quranReference: 'FIXTURE ref 1:2-4',
    });
    expect(cards[1]).toEqual({ kind: 'quran', duaKey: 'quran:1:1', preview: null, quranReference: 'FIXTURE ref 1:1-1' });
  });

  it('puts a Duas favourite first when both kinds were saved at the same moment', () => {
    const cards = list([{ duaKey: 'hadeethenc:1', createdAt: 50 }], [{ entryKey: 'FIXTURE:entry-1', createdAt: 50 }]);

    expect(cards.map((card) => card.kind)).toEqual(['hadith', 'hisn']);
  });

  it('skips a Hisn favourite that is not a Hisn dua now: not a dua, in a session, or gone', () => {
    const cards = list(
      [],
      [
        { entryKey: 'FIXTURE:entry-3', createdAt: 3 }, // not a dua
        { entryKey: 'FIXTURE:entry-5', createdAt: 4 }, // home 'duas' but in a session
        { entryKey: 'FIXTURE:gone', createdAt: 5 }, // no such entry
        { entryKey: 'FIXTURE:entry-2', createdAt: 6 }, // a Hisn dua
      ],
    );

    expect(cards.map((card) => (card.kind === 'hisn' ? card.entryKey : card.kind))).toEqual(['FIXTURE:entry-2']);
  });

  it('skips a Duas favourite whose row is gone from the pack', () => {
    const cards = list([{ duaKey: 'quran:9:9', createdAt: 1 }], []);
    expect(cards).toEqual([]);
  });

  it('keeps the Duas favourites and drops the Hisn ones when no azkar pack is installed', () => {
    executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);

    const cards = list(
      [
        { duaKey: 'quran:1:1', createdAt: 100 },
        { duaKey: 'hadeethenc:1', createdAt: 300 },
      ],
      [{ entryKey: 'FIXTURE:entry-1', createdAt: 200 }],
    );

    expect(cards.map((card) => (card.kind === 'hisn' ? card.entryKey : card.duaKey))).toEqual(['hadeethenc:1', 'quran:1:1']);
  });

  it('gives an empty list when there are no favourites of either kind', () => {
    expect(list([], [])).toEqual([]);
  });

  it('shows a HadeethEnc favourite by its title, with no reference', () => {
    const [card] = list([{ duaKey: 'hadeethenc:1', createdAt: 1 }], []);
    expect(card).toEqual({ kind: 'hadith', duaKey: 'hadeethenc:1', preview: 'FIXTURE title 1', quranReference: null });
  });
});
