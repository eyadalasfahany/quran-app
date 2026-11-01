import type { SqlExecutor } from '@/core/db/sql-executor';
import type { Locale } from '@/core/i18n/locale';

import { getCategory, getEntry, listCategoryUnits } from './content-repository';
import type { AzkarOccasion } from './model';
import { buildReaderUnits } from './reader-units';
import { periodKey, scopeKeyForCategory, scopeKeyForEntry } from './progress';

const CATEGORY_PREFIX = 'category:';
const ENTRY_PREFIX = 'entry:';

/** A progress scope resolved against content: its current period and how many units it holds. */
export type ResolvedAzkarScope = {
  scopeKey: string;
  periodKey: string;
  total: number;
  categoryId: string | null;
  entryKey: string | null;
  occasion: AzkarOccasion | null;
};

/**
 * Resolves a progress scope key (`category:<id>` or `entry:<key>`) to its current period and unit total. Unknown or
 * unreadable scopes resolve to null, so Home skips them (see `pickLastActiveScope`).
 */
export function resolveAzkarScope(db: SqlExecutor, locale: Locale, now: Date): (scopeKey: string) => ResolvedAzkarScope | null {
  return (scopeKey) => {
    try {
      if (scopeKey.startsWith(CATEGORY_PREFIX)) {
        const categoryId = scopeKey.slice(CATEGORY_PREFIX.length);
        const category = getCategory(db, categoryId);
        if (category === undefined) {
          return null;
        }
        return {
          scopeKey: scopeKeyForCategory(categoryId),
          periodKey: periodKey(category.progressPeriod, now),
          total: listCategoryUnits(db, categoryId, locale).length,
          categoryId,
          entryKey: null,
          occasion: category.occasion,
        };
      }

      if (scopeKey.startsWith(ENTRY_PREFIX)) {
        const entryKey = scopeKey.slice(ENTRY_PREFIX.length);
        const detail = getEntry(db, entryKey);
        if (detail === undefined) {
          return null;
        }
        return {
          scopeKey: scopeKeyForEntry(entryKey),
          periodKey: periodKey('session', now),
          total: buildReaderUnits(entryKey, detail.items, locale, {
            variations: detail.variations,
            activeVariation: detail.activeVariation,
          }).length,
          categoryId: null,
          entryKey,
          occasion: detail.entry.occasion,
        };
      }
    } catch {
      return null;
    }
    return null;
  };
}
