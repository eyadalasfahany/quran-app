import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { listHisnDuaTopics } from '@/features/azkar/data';

import { at, openAzkarContentDb } from '../../../../jest/azkar-test-db';
import {
  seedHadithBookFixtures,
  seedQuranVerseFixtures,
} from '../../../../jest/duas-pack-fixtures';
import { seedHisnFixture } from '../../../../jest/hisn-dua-fixtures';
import { duaTopicCategoryId, listDuaCategories, listDuaCategoryItems, parseDuaCategoryId } from './categories';
import { listDuaTopicItems, listDuaTopics } from './topics';

const DUAS_RESOURCE_ID = 50;
const BUKHARI_RESOURCE_ID = 60;

/** A quranic-reference formatter for the tests: the surah and verse numbers, never verse text. */
const fakeReference = (ref: { surah: number; verseFrom: number; verseTo: number }) =>
  `FIXTURE ref ${ref.surah}:${ref.verseFrom}-${ref.verseTo}`;

/** Installs a duas pack with two Quranic duas (quran:1:1, quran:1:2) and their placeholder verses. */
function seedQuranicDuas(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at) VALUES (?, 'duas', 1, 'fixture', 0)`,
    [DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_items (resource_id, id, dua_key, kind, group_id, position)
     VALUES (?, 1, 'quran:1:1', 'quran', NULL, 1), (?, 2, 'quran:1:2', 'quran', NULL, 2)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  executor.run(
    `INSERT INTO dua_quran_spans (resource_id, item_id, surah, verse_from, verse_to)
     VALUES (?, 1, 1, 1, 1), (?, 2, 1, 2, 2)`,
    [DUAS_RESOURCE_ID, DUAS_RESOURCE_ID],
  );
  seedQuranVerseFixtures(executor);
}

/** Two chapters of the bukhari book 80: chapter 1 holds two hadiths, chapter 2 none. */
function seedHadithChapters(executor: SqlExecutor): void {
  executor.run(
    `INSERT INTO hadith_chapters (resource_id, id, book_id, chapter_number, source_chapter_key, title_ar, title_en, position, hadith_count)
     VALUES (?, 1, 1, 1, NULL, 'FIXTURE chapter 1', NULL, 1, 2),
            (?, 2, 1, 2, NULL, 'FIXTURE chapter 2', NULL, 2, 0)`,
    [BUKHARI_RESOURCE_ID, BUKHARI_RESOURCE_ID],
  );
}

function link(executor: SqlExecutor, topicId: string, kind: string, key: string, position: number): void {
  executor.run(
    'INSERT INTO dua_topic_links (resource_id, id, topic_id, target_kind, target_key, position) VALUES (?, ?, ?, ?, ?, ?)',
    [DUAS_RESOURCE_ID, position, topicId, kind, key, position],
  );
}

describe('duas topics', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('lists no topic and no item when no pack is installed', () => {
    expect(listDuaTopics(executor)).toEqual([]);
    expect(listDuaTopicItems(executor, 'prayer', fakeReference)).toEqual([]);
  });

  it('lists a topic with a Quranic dua alone, and skips a link whose key is absent from the pack', () => {
    seedQuranicDuas(executor);
    link(executor, 'prayer', 'quran', 'quran:1:1', 1);
    link(executor, 'prayer', 'quran', 'quran:9:9', 2);

    expect(listDuaTopics(executor)).toEqual([{ id: 'prayer', count: 1 }]);
    expect(listDuaTopicItems(executor, 'prayer', fakeReference)).toEqual([
      {
        kind: 'quran',
        duaKey: 'quran:1:1',
        text: 'FIXTURE verse 1:1 — not Quran',
        quranReference: 'FIXTURE ref 1:1-1',
      },
    ]);
  });

  it('lists a topic with a hadith dua-book chapter alone, and skips an empty or unresolved chapter', () => {
    seedQuranicDuas(executor);
    seedHadithBookFixtures(executor);
    seedHadithChapters(executor);
    link(executor, 'fasting', 'hadith_chapter', 'hadithchapter:bukhari:80:1', 1);
    link(executor, 'fasting', 'hadith_chapter', 'hadithchapter:bukhari:80:2', 2);
    link(executor, 'fasting', 'hadith_chapter', 'hadithchapter:bukhari:99:1', 3);

    expect(listDuaTopics(executor)).toEqual([{ id: 'fasting', count: 1 }]);
    expect(listDuaTopicItems(executor, 'fasting', fakeReference)).toEqual([
      {
        kind: 'hadith-chapter',
        slug: 'bukhari',
        bookNumber: '80',
        chapterNumber: 1,
        bookId: 1,
        chapterId: 1,
        title: 'FIXTURE chapter 1',
        count: 2,
      },
    ]);
  });

  it('lists the Hisn topics alone, with the Hisn count', () => {
    seedHisnFixture(executor);
    const hisn = listHisnDuaTopics(executor);
    const first = at(hisn, 0);

    expect(listDuaTopics(executor)).toEqual(hisn.map((topic) => ({ id: topic.id, count: topic.count })));
    expect(listDuaTopicItems(executor, first.id, fakeReference).every((item) => item.kind === 'hisn')).toBe(true);
  });

  it('counts a topic across its three sources', () => {
    seedQuranicDuas(executor);
    seedHadithBookFixtures(executor);
    seedHadithChapters(executor);
    seedHisnFixture(executor);
    const hisn = at(listHisnDuaTopics(executor), 0);
    link(executor, hisn.id, 'quran', 'quran:1:1', 1);
    link(executor, hisn.id, 'hadith_chapter', 'hadithchapter:bukhari:80:1', 2);

    expect(listDuaTopics(executor)).toContainEqual({ id: hisn.id, count: hisn.count + 2 });
    expect(listDuaTopicItems(executor, hisn.id, fakeReference).map((item) => item.kind)).toEqual([
      'quran',
      'hadith-chapter',
      ...Array.from({ length: hisn.count }, () => 'hisn'),
    ]);
  });

  it('shows an item in its topic and still in its source category', () => {
    seedQuranicDuas(executor);
    link(executor, 'prayer', 'quran', 'quran:1:2', 1);

    const inQuran = listDuaCategoryItems(executor, 'quran', fakeReference).map((item) => item.kind === 'quran' && item.duaKey);
    const inTopic = listDuaCategoryItems(executor, duaTopicCategoryId('prayer'), fakeReference).map((item) => item.kind === 'quran' && item.duaKey);

    expect(inQuran).toContain('quran:1:2');
    expect(inTopic).toEqual(['quran:1:2']);
    expect(listDuaCategories(executor).map((category) => category.id)).toContain('quran');
  });

  it('parses a topic route id and rejects an empty topic', () => {
    expect(parseDuaCategoryId('topic:prayer')).toEqual({ kind: 'topic', topicId: 'prayer' });
    expect(parseDuaCategoryId('topic:')).toBeNull();
  });
});
