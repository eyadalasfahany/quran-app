import type { Href } from 'expo-router';

import { duasHref } from '../routes';

/**
 * The pager inside one Duas category (ADR 0091 decision 11). `position` is 1-based and counts the category's own items,
 * so «n من N» matches the category's count. `previousHref` and `nextHref` are null at the ends.
 */
export type DuaPager = {
  position: number;
  total: number;
  previousHref: Href | null;
  nextHref: Href | null;
};

/** Reads a category item's position from the route: a whole number, 0-based. Null for anything else. */
export function parseCategoryItemIndex(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

/** The pager of the item at `index` (0-based) in a category of `total` items. */
export function categoryPager(categoryId: string, total: number, index: number): DuaPager {
  return {
    position: index + 1,
    total,
    previousHref: index > 0 ? duasHref.categoryItem(categoryId, index - 1) : null,
    nextHref: index < total - 1 ? duasHref.categoryItem(categoryId, index + 1) : null,
  };
}
