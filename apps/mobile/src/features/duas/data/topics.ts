import type { SqlExecutor } from '@/core/db/sql-executor';
import { listHisnDuaEntries, listHisnDuaTopics } from '@/features/azkar/data';
import { getCollection, listBooks, listChapters } from '@/features/hadith/data';

import { activeDuasResourceId } from './active-resource';
import { DUA_TOPIC_ORDER } from './topic-order';
import { getQuranicDuaText, listQuranicDuas } from './content-repository';
import type { DuaCategoryItem } from './model';

/**
 * Duas topics across sources (ADR 0092 decisions 1, 2 and 10). A topic gathers the Quranic duas, the hadith dua-book
 * chapters and the Hisn duas that config/duas_topics.php and the Azkar topics put under it. Each item appears in its
 * topic and still in its source category. A topic with no item is never listed. Hadith chapters are read from the
 * hadith packs on the device; nothing is copied into the duas pack.
 */

export type DuaTopic = {
  /** The shared topic id (config azkar_topics.php `topics`). The route id is `topic:<id>`. */
  id: string;
  /** The number of items in the topic, across the three sources. Always at least 1. */
  count: number;
};

export type DuaTopicLinkTargetKind = 'quran' | 'hadith_chapter';

type TopicLinkRow = {
  topicId: string;
  targetKind: DuaTopicLinkTargetKind | string;
  targetKey: string;
  position: number;
};

type ResolvedHadithChapter = {
  collectionSlug: string;
  bookNumber: string;
  chapterNumber: number;
  bookId: number;
  chapterId: number;
  titleAr: string | null;
  hadithCount: number;
};

const HADITH_CHAPTER_KEY = /^hadithchapter:([a-z0-9]+):([0-9]+):([0-9]+)$/;

/** Every topic link of the active duas resource, in position order. Empty when no duas pack is installed. */
function listTopicLinkRows(db: SqlExecutor): TopicLinkRow[] {
  const resourceId = activeDuasResourceId(db);
  if (resourceId === -1) {
    return [];
  }
  return db.all<TopicLinkRow>(
    `SELECT topic_id AS topicId, target_kind AS targetKind, target_key AS targetKey, position
     FROM dua_topic_links
     WHERE resource_id = ?
     ORDER BY position, id`,
    [resourceId],
  );
}

/**
 * A hadith dua-book chapter, resolved through the hadith pack of its collection. Undefined when the key is malformed,
 * the collection or book is not installed, or the chapter holds no hadith (the chapter is then not shown).
 */
function resolveHadithChapter(db: SqlExecutor, targetKey: string): ResolvedHadithChapter | undefined {
  const match = HADITH_CHAPTER_KEY.exec(targetKey);
  if (match === null || getCollection(db, match[1] ?? '') === undefined) {
    return undefined;
  }
  const collectionSlug = match[1] ?? '';
  const bookNumber = match[2] ?? '';
  const chapterNumber = Number(match[3]);

  const book = listBooks(db, collectionSlug).find((candidate) => candidate.bookNumber === bookNumber);
  if (book === undefined) {
    return undefined;
  }
  const chapter = listChapters(db, collectionSlug, book.id).find((candidate) => candidate.chapterNumber === chapterNumber);
  if (chapter === undefined || chapter.hadithCount < 1) {
    return undefined;
  }
  return {
    collectionSlug,
    bookNumber,
    chapterNumber,
    bookId: book.id,
    chapterId: chapter.id,
    titleAr: chapter.titleAr,
    hadithCount: chapter.hadithCount,
  };
}

/**
 * The topics that hold at least one item, in config order (DUA_TOPIC_ORDER), then any other id. A Quranic link counts only when its dua
 * is accepted in the duas pack; a hadith link only when its chapter resolves; the Hisn duas come from the Azkar pack.
 */
export function listDuaTopics(db: SqlExecutor): DuaTopic[] {
  const counts = new Map<string, number>();
  const add = (topicId: string, by: number): void => {
    counts.set(topicId, (counts.get(topicId) ?? 0) + by);
  };

  const quranKeys = new Set(listQuranicDuas(db).map((dua) => dua.duaKey));
  for (const link of listTopicLinkRows(db)) {
    if (link.targetKind === 'quran' && quranKeys.has(link.targetKey)) {
      add(link.topicId, 1);
    } else if (link.targetKind === 'hadith_chapter' && resolveHadithChapter(db, link.targetKey) !== undefined) {
      add(link.topicId, 1);
    }
  }
  for (const topic of listHisnDuaTopics(db)) {
    add(topic.id, topic.count);
  }

  const ordered = DUA_TOPIC_ORDER.filter((id) => (counts.get(id) ?? 0) > 0);
  // A topic id the config does not list (never expected in production) follows the configured ones, in id order.
  const unlisted = [...counts.keys()].filter((id) => !DUA_TOPIC_ORDER.includes(id)).sort();
  return [...ordered, ...unlisted].map((id) => ({ id, count: counts.get(id) ?? 0 }));
}

/**
 * The items of one topic, in a stable order: the Quranic duas (Mushaf order), then the hadith dua-book chapters
 * (config position order), then the Hisn duas (chapter order). Unknown or empty topics return [].
 */
export function listDuaTopicItems(
  db: SqlExecutor,
  topicId: string,
  quranReference: (ref: { surah: number; verseFrom: number; verseTo: number }) => string | null = () => null,
): DuaCategoryItem[] {
  const links = listTopicLinkRows(db).filter((link) => link.topicId === topicId);
  const items: DuaCategoryItem[] = [];

  const quranKeys = new Set(links.filter((link) => link.targetKind === 'quran').map((link) => link.targetKey));
  for (const dua of listQuranicDuas(db)) {
    if (quranKeys.has(dua.duaKey)) {
      items.push({
        kind: 'quran',
        duaKey: dua.duaKey,
        text: getQuranicDuaText(db, dua),
        quranReference: quranReference({ surah: dua.surah, verseFrom: dua.verseFrom, verseTo: dua.verseTo ?? dua.verseFrom }),
      });
    }
  }

  for (const link of links) {
    if (link.targetKind !== 'hadith_chapter') {
      continue;
    }
    const chapter = resolveHadithChapter(db, link.targetKey);
    if (chapter !== undefined) {
      items.push({
        kind: 'hadith-chapter',
        slug: chapter.collectionSlug,
        bookNumber: chapter.bookNumber,
        chapterNumber: chapter.chapterNumber,
        bookId: chapter.bookId,
        chapterId: chapter.chapterId,
        title: chapter.titleAr === null || chapter.titleAr.trim() === '' ? null : chapter.titleAr,
        count: chapter.hadithCount,
      });
    }
  }

  for (const entry of listHisnDuaEntries(db, topicId)) {
    items.push({
      kind: 'hisn',
      entryKey: entry.entryKey,
      chapterTitle: entry.chapterTitle,
      preview: entry.preview,
      quranRefs: entry.quranRefs,
      bookNumber: entry.bookNumber,
    });
  }

  return items;
}
