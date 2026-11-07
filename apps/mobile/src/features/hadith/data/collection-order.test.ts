import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { HADITH_COLLECTION_SLUGS, hadithCollectionNumber, slugFromManifestKey } from './collection-order';

describe('collection order', () => {
  it('lists the ten canonical slugs in the order of config/hadith.php', () => {
    const config = readFileSync(join(process.cwd(), '../api/config/hadith.php'), 'utf8');
    const marker = "'collections' => [";
    const start = config.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    const end = config.indexOf(']', start);
    const block = config.slice(start + marker.length, end);
    const slugs = [...block.matchAll(/'([a-z0-9]+)'/g)].map((match) => match[1]);

    expect(HADITH_COLLECTION_SLUGS).toEqual(slugs);
    expect(HADITH_COLLECTION_SLUGS).toHaveLength(10);
  });

  it('numbers a known slug from 1 and returns undefined for an unknown one', () => {
    expect(hadithCollectionNumber('bukhari')).toBe(1);
    expect(hadithCollectionNumber('shahwaliullah40')).toBe(10);
    expect(hadithCollectionNumber('fixture-single')).toBeUndefined();
  });

  it('reads a canonical slug from a manifest key and ignores anything else', () => {
    expect(slugFromManifestKey({ id: 1, key: 'nawawi40' })).toBe('nawawi40');
    expect(slugFromManifestKey({ id: 1 })).toBeNull();
    expect(slugFromManifestKey({ id: 1, key: 'unknown-slug' })).toBeNull();
    expect(slugFromManifestKey({ id: 1, key: 7 })).toBeNull();
    expect(slugFromManifestKey(null)).toBeNull();
  });
});
