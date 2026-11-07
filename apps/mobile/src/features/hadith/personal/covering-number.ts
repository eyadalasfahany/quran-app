import type { SqlExecutor } from '@/core/db/sql-executor';

import { hadithResourceId } from '../data';
import type { HadithNumberResolver } from './model';

/** TODO-free seam: the real lookup arrives with the merge data (plan step 6b, Open question 1). Until then no number is merged. */
export const resolveCoveringNumber: HadithNumberResolver = () => null;

function hasExactHadith(content: SqlExecutor, resourceId: number, hadithNumber: string): boolean {
  return (
    content.get<{ one: number }>(
      'SELECT 1 AS one FROM hadith_entries WHERE resource_id = ? AND hadith_number = ? LIMIT 1',
      [resourceId, hadithNumber],
    ) !== undefined
  );
}

/**
 * The number to store or open for `hadithNumber`: itself when `content.db` has a hadith with that exact number
 * (`hadith_entries.hadith_number`, the same test `getHadith` uses), else the resolver's covering number, else the
 * number unchanged. Returns the input when the collection is not installed or `content` is unavailable.
 */
export function canonicalHadithNumber(
  content: SqlExecutor | undefined,
  slug: string,
  hadithNumber: string,
  resolver: HadithNumberResolver = resolveCoveringNumber,
): string {
  if (content === undefined) {
    return hadithNumber;
  }
  const resourceId = hadithResourceId(content, slug);
  if (resourceId === undefined) {
    return hadithNumber;
  }
  // An exact number always wins over the resolver.
  if (hasExactHadith(content, resourceId, hadithNumber)) {
    return hadithNumber;
  }

  let covering: string | null;
  try {
    covering = resolver(content, slug, hadithNumber);
  } catch {
    return hadithNumber;
  }
  // Nothing is pointed at a hadith the pack does not hold.
  if (covering !== null && hasExactHadith(content, resourceId, covering)) {
    return covering;
  }
  return hadithNumber;
}
