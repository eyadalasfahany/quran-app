import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { HADITH_TEXT_1, seedDuasFixtures, seedHadithBookFixtures } from '../../../../jest/duas-pack-fixtures';
import type { DuaCategory } from './model';
import { searchDuas } from './search';

const LABELS: Record<string, string> = {
  quran: 'FIXTURE quran duas',
  'hadeethenc:1': 'FIXTURE group one',
  'hisn:browse-a': 'FIXTURE topic alpha',
  'hisn:browse-b': 'FIXTURE topic beta',
};
const labelOf = (category: DuaCategory) => LABELS[category.id] ?? category.id;

const KIND_ORDER: Record<string, number> = { quran: 0, hadith: 1, hisn: 2 };

describe('searchDuas', () => {
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

  it('matches a hadith book category by its name, as a category (ADR 0091 part 4)', () => {
    seedHadithBookFixtures(executor);
    const labelByTitle = (category: DuaCategory) => category.title ?? category.id;

    const result = searchDuas(executor, 'book title 80', labelByTitle);

    expect(result.categories.map((match) => match.category.id)).toEqual(['hadithbook:bukhari:80']);
    expect(result.categories[0]?.category.kind).toBe('hadithbook');
  });

  it('returns nothing for an empty or blank query', () => {
    expect(searchDuas(executor, '', labelOf)).toEqual({ categories: [], duas: [] });
    expect(searchDuas(executor, '   ', labelOf)).toEqual({ categories: [], duas: [] });
  });

  it('lists a category whose name matches, with its name and highlight', () => {
    const result = searchDuas(executor, 'topic alpha', labelOf);

    expect(result.categories.map((match) => match.category.id)).toEqual(['hisn:browse-a']);
    const [match] = result.categories;
    expect(match?.label).toBe('FIXTURE topic alpha');
    expect(match?.highlight).toEqual({ start: 8, end: 19 });
    expect(result.duas).toEqual([]);
  });

  it('finds a HadeethEnc dua by its text, with the match highlighted and its group as category', () => {
    const { duas } = searchDuas(executor, 'تجريبي', labelOf);

    const hadith = duas.find((hit) => hit.kind === 'hadith' && hit.duaKey === 'hadeethenc:1');
    expect(hadith).toMatchObject({ kind: 'hadith', categoryId: 'hadeethenc:1', preview: HADITH_TEXT_1 });
    const range = hadith?.kind === 'hadith' ? hadith.highlight : null;
    expect(range && HADITH_TEXT_1.slice(range.start, range.end)).toBe('تجريبي');
  });

  it('matches Arabic regardless of harakat and alef forms, as Azkar search does', () => {
    // The query has harakat (stripped) and the text has «إ» (folded to «ا»); both sides are normalised before matching.
    const withHarakat = searchDuas(executor, 'دُعَاءً', labelOf).duas.map((hit) => hit.key);
    expect(withHarakat).toContain('hadith:hadeethenc:1');

    const alefVariant = searchDuas(executor, 'الى', labelOf).duas.map((hit) => hit.key);
    expect(alefVariant).toContain('hadith:hadeethenc:1');
  });

  it('gives a HadeethEnc dua outside every group no category', () => {
    const hit = searchDuas(executor, 'بلا مجموعة', labelOf).duas.find((candidate) => candidate.kind === 'hadith');
    expect(hit).toMatchObject({ duaKey: 'hadeethenc:2', categoryId: null });
  });

  it('finds a Quranic dua by its surah name only, with no verse text', () => {
    const { duas } = searchDuas(executor, 'surah one', labelOf);

    expect(duas).toEqual([
      expect.objectContaining({ kind: 'quran', duaKey: 'quran:1:1', categoryId: 'quran', surah: 1, verseFrom: 1, verseTo: 1 }),
    ]);
  });

  it('finds a Hisn dua by its Azkar text, under its first browse topic', () => {
    const { duas } = searchDuas(executor, 'text 1', labelOf);

    const hisn = duas.find((hit) => hit.kind === 'hisn');
    expect(hisn).toMatchObject({ kind: 'hisn', entryKey: 'FIXTURE:entry-1', categoryId: 'hisn:browse-a' });
    expect(hisn?.kind === 'hisn' && hisn.highlight && hisn.preview.slice(hisn.highlight.start, hisn.highlight.end)).toBe('text 1');
  });

  it('never lists a Hisn entry that is in a session, or that is not a dua', () => {
    // entry-5 is home 'duas' but in a session (it stays in Azkar); entry-3 is not a dua at all.
    expect(searchDuas(executor, 'text 5', labelOf).duas.filter((hit) => hit.kind === 'hisn')).toEqual([]);
    expect(searchDuas(executor, 'text 3', labelOf).duas.filter((hit) => hit.kind === 'hisn')).toEqual([]);
  });

  it('orders Quranic duas, then HadeethEnc, then Hisn', () => {
    const kinds = searchDuas(executor, 'FIXTURE', labelOf).duas.map((hit) => hit.kind);

    expect(kinds).toEqual([...kinds].sort((a, b) => (KIND_ORDER[a] ?? 9) - (KIND_ORDER[b] ?? 9)));
    expect(kinds[0]).toBe('quran');
    expect(kinds.at(-1)).toBe('hisn');
  });

  it('caps the results at the limit', () => {
    expect(searchDuas(executor, 'FIXTURE', labelOf, 2).duas).toHaveLength(2);
  });

  it('shows no Hisn dua when no azkar pack is installed, and keeps the other duas', () => {
    executor.run(`DELETE FROM installed_resources WHERE "group" = 'azkar'`);

    expect(searchDuas(executor, 'تجريبي', labelOf).duas.map((hit) => hit.kind)).toEqual(['hadith', 'hadith']);
    expect(searchDuas(executor, 'text 1', labelOf).duas).toEqual([]);
  });

  it('shows no dua when no duas pack is installed', () => {
    executor.run(`DELETE FROM installed_resources WHERE "group" = 'duas'`);

    expect(searchDuas(executor, 'تجريبي', labelOf).duas).toEqual([]);
    expect(searchDuas(executor, 'surah one', labelOf).duas).toEqual([]);
  });

  it('finds nothing for a query that matches nothing', () => {
    expect(searchDuas(executor, 'لا شيء يطابق', labelOf)).toEqual({ categories: [], duas: [] });
  });
});
