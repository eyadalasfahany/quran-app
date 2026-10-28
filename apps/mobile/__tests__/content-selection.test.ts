import type { ContentManifestResource } from '@quran/api-contract';

import { storage, storageKeys } from '@/core/storage/mmkv';
import { defaultSelectedResourceIds, selectedResourceIds } from '@/core/sync/selection';

function resource(
  overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id' | 'group'>,
): ContentManifestResource {
  return {
    name: null,
    name_ar: null,
    author_name: null,
    language_code: null,
    direction: null,
    version: 1,
    pack: { url: '/api/v1/content/packs/1/1', size_bytes: 1, sha256: 'abc' },
    changes_since_min_version: 1,
    ...overrides,
  };
}

const resources: ContentManifestResource[] = [
  resource({ id: 1, group: 'mushafs' }),
  resource({ id: 2, group: 'mushafs' }),
  resource({ id: 20, group: 'tafsirs', language_code: 'fr' }),
  resource({ id: 21, group: 'tafsirs', language_code: 'en' }),
  resource({ id: 30, group: 'chapter_recitations' }),
  resource({ id: 31, group: 'chapter_recitations' }),
];

describe('content selection', () => {
  afterEach(() => {
    storage.remove(storageKeys.selectedResourceIds);
    storage.remove(storageKeys.locale);
    storage.remove(storageKeys.readerSettings);
  });

  it('picks every mushaf, the locale tafsir and the first recitation', () => {
    expect(defaultSelectedResourceIds(resources, 'ar')).toEqual([1, 2, 21, 30]);
    expect(defaultSelectedResourceIds(resources, 'en')).toEqual([1, 2, 21, 30]);
  });

  it('falls back to English when the locale has no tafsir', () => {
    const withoutFrench = resources.filter((item) => item.language_code !== 'fr');
    expect(defaultSelectedResourceIds(withoutFrench, 'ar')).toEqual([1, 2, 21, 30]);
  });

  it('uses the saved ids when the reader has chosen', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([99, 100]));

    expect(selectedResourceIds(resources)).toEqual([99, 100]);
  });
});
