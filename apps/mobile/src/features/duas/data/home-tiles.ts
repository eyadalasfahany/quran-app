import type { TFunction } from 'i18next';

import type { Locale } from '@/core/i18n';

import { duaTopicCategoryId, parseDuaCategoryId } from './categories';
import { categoryName } from './category-labels';
import type { DuaCategory } from './model';
import type { DuaTopic } from './topics';

/**
 * The Duas home tiles and category headings (screens/, #DuasHomeCategories and #DuasCategory; ADR 0092 decision 1).
 * The home lists, in order: the Quranic duas, the five hadith dua books, the HadeethEnc groups as received, then the
 * topics that hold at least one dua. Every tile's id is its route id (`quran`, `hadithbook:…`, `hadeethenc:…`,
 * `topic:<id>`). Hisn-only categories are not on the home: their duas are in the topics.
 */

export type DuaHomeTile = {
  /** The route id the tile opens (`duaCategoryHeading` reads it back). */
  id: string;
  name: string;
  count: number;
};

/** The tiles of the Duas home, in display order. A category or topic with no item is never listed. */
export function duaHomeTiles(categories: readonly DuaCategory[], topics: readonly DuaTopic[], t: TFunction, locale: Locale): DuaHomeTile[] {
  const byKind = (kind: DuaCategory['kind']) => categories.filter((category) => category.kind === kind);
  const categoryTiles = (list: readonly DuaCategory[]): DuaHomeTile[] =>
    list.map((category) => ({ id: category.id, name: categoryName(category, t, locale), count: category.count }));

  return [
    ...categoryTiles(byKind('quran')),
    ...categoryTiles(byKind('hadithbook')),
    ...categoryTiles(byKind('hadeethenc')),
    ...topics.map((topic) => ({
      id: duaTopicCategoryId(topic.id),
      name: t(`azkar.categories.${topic.id}` as never),
      count: topic.count,
    })),
  ];
}

/**
 * The heading of one category page: its name and count. A `topic:<id>` route reads the topic list; every other route
 * reads the category list. Undefined for an id no category or topic has (the screen shows the Duas title).
 */
export function duaCategoryHeading(
  categoryId: string,
  categories: readonly DuaCategory[],
  topics: readonly DuaTopic[],
  t: TFunction,
  locale: Locale,
): { title: string; count: number } | undefined {
  const parsed = parseDuaCategoryId(categoryId);
  if (parsed?.kind === 'topic') {
    const topic = topics.find((candidate) => candidate.id === parsed.topicId);
    return topic === undefined ? undefined : { title: t(`azkar.categories.${topic.id}` as never), count: topic.count };
  }
  const category = categories.find((candidate) => candidate.id === categoryId);
  return category === undefined ? undefined : { title: categoryName(category, t, locale), count: category.count };
}
