import type { ReaderUnit } from './reader-units';
import { firstArabicText } from './preview';

/** One dhikr card on the category screen: an entry, shown once, with its first unit's key for the reader. */
export type CategoryCard = {
  entryKey: string;
  /** The unit the card opens in the reader. */
  unitKey: string;
  preview: string | null;
  /** The sourced count of the entry's first unit, or null. Never defaulted. */
  requiredCount: number | null;
  /** True when every unit of the entry is completed in the current period. */
  done: boolean;
};

/**
 * Groups reader units into one card per entry, in unit order. `completed` holds the completed unit keys of the
 * current period.
 */
export function buildCategoryCards(units: readonly ReaderUnit[], completed: ReadonlySet<string>): CategoryCard[] {
  const byEntry = new Map<string, ReaderUnit[]>();
  for (const unit of units) {
    const list = byEntry.get(unit.entryKey) ?? [];
    list.push(unit);
    byEntry.set(unit.entryKey, list);
  }

  const cards: CategoryCard[] = [];
  for (const [entryKey, entryUnits] of byEntry) {
    const first = entryUnits[0];
    if (first === undefined) {
      continue;
    }
    cards.push({
      entryKey,
      unitKey: first.unitKey,
      preview: firstArabicText(first.body),
      requiredCount: first.requiredCount,
      done: entryUnits.every((unit) => completed.has(unit.unitKey)),
    });
  }
  return cards;
}
