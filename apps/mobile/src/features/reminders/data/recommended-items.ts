/** The rows of the recommended-set sheet, in order. Azkar rows appear only when Azkar content is installed. */
export type RecommendedItemKey = 'prayers' | 'morning' | 'evening' | 'friday';

export function recommendedItems(hasAzkar: boolean): RecommendedItemKey[] {
  return hasAzkar ? ['prayers', 'morning', 'evening', 'friday'] : ['prayers', 'friday'];
}
