import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { getQuranSegmentVerses, listCategoryUnits } from './content-repository';
import { loadAzkarDevFixtures } from './dev-fixtures';
import { azkarShareText } from './share-text';

const SOURCE = 'حصن المسلم · 1';

describe('azkar share text', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    database.exec(`
      INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
      VALUES (1, '1:1', 1, 1, 1, 1, 1, 1, 'none', 'FIXTURE VERSE 1:1', 'fixture verse 1 1');
    `);
    loadAzkarDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('is the unit Arabic text, a blank line and the source line, with nothing else', () => {
    const unit = at(listCategoryUnits(executor, 'morning', 'ar'), 0);

    const text = azkarShareText(unit, () => [], SOURCE);

    expect(text).toBe('نص تجريبي ١ — ليس ذكرًا\n\nحصن المسلم · 1');
  });

  it('wraps a Quran segment in ﴿ ﴾ with its verses from verses', () => {
    const unit = listCategoryUnits(executor, 'morning', 'ar').find(
      (candidate) => candidate.entryKey === 'fixture:entry-002',
    );
    expect(unit).toBeDefined();

    const text = azkarShareText(
      unit!,
      (segment) => getQuranSegmentVerses(executor, segment).map((verse) => verse.textUthmani),
      SOURCE,
    );

    expect(text).toBe('نص تجريبي ٣ — ليس ذكرًا ﴿FIXTURE VERSE 1:1﴾\n\nحصن المسلم · 1');
  });

  it('omits a Quran segment that resolves to no verses', () => {
    const units = listCategoryUnits(executor, 'morning', 'ar');
    const unit = units.find((candidate) => candidate.entryKey === 'fixture:entry-002');
    expect(unit).toBeDefined();

    const text = azkarShareText(unit!, () => [], SOURCE);

    expect(text).toBe('نص تجريبي ٣ — ليس ذكرًا\n\nحصن المسلم · 1');
  });

  it('shares only the Arabic steps of a unit, in order', () => {
    const units = listCategoryUnits(executor, 'before_sleep', 'ar');
    const text = azkarShareText(at(units, 0), () => [], SOURCE);

    expect(text).toBe('تعليمات تجريبية ٢ — ليست ذكرًا نص تجريبي ٦ — ليس ذكرًا\n\nحصن المسلم · 1');
  });
});
