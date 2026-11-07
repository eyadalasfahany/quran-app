import { HADITH_COLLECTION_ORDER } from '../constants';

export const HADITH_COLLECTION_SLUGS: readonly string[] = HADITH_COLLECTION_ORDER;

/** The 1-based position of a canonical slug, or `undefined` for a slug outside the fixed ten. */
export function hadithCollectionNumber(slug: string): number | undefined {
  const index = HADITH_COLLECTION_SLUGS.indexOf(slug);
  return index === -1 ? undefined : index + 1;
}

/**
 * Reads the collection slug from one raw manifest resource (the additive `key` field from step 7, which is
 * `resources.source_key`). Returns `null` when the field is absent (an older server) or is not a canonical slug.
 */
export function slugFromManifestKey(resource: unknown): string | null {
  if (typeof resource !== 'object' || resource === null || !('key' in resource)) {
    return null;
  }
  const key = resource.key;
  return typeof key === 'string' && HADITH_COLLECTION_SLUGS.includes(key) ? key : null;
}
