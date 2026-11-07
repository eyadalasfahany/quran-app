/**
 * The ten canonical collection slugs in their fixed order (ADR 0042, D13). The same order as `collections` in
 * `apps/api/config/hadith.php`. The position plus one is the n in the numbered fallback «مجموعة {n}».
 */
export const HADITH_COLLECTION_ORDER = [
  'bukhari',
  'muslim',
  'abudawud',
  'tirmidhi',
  'ibnmajah',
  'nasai',
  'malik',
  'nawawi40',
  'qudsi40',
  'shahwaliullah40',
] as const;

/** Rows per page for the book and chapter hadith lists. The hooks load more as the reader scrolls. */
export const HADITH_LIST_PAGE_SIZE = 50;
