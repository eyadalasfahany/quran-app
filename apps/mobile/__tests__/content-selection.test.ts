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
    author_ar: null,
    is_default: false,
    style: null,
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

  it('picks every mushaf and the first recitation, and no tafsir, in either locale', () => {
    expect(defaultSelectedResourceIds(resources)).toEqual([1, 2, 30]);

    storage.set(storageKeys.locale, 'en');
    expect(selectedResourceIds(resources)).toEqual([1, 2, 30]);
  });

  it('contains no tafsir with no saved selection and no reader choice', () => {
    const ids = selectedResourceIds(resources);

    expect(ids).toEqual([1, 2, 30]);
    expect(ids).not.toContain(20);
    expect(ids).not.toContain(21);
  });

  it('adds the reader-chosen tafsir', () => {
    storage.set(
      storageKeys.readerSettings,
      JSON.stringify({ version: 1, mode: 'reading', fontScale: 1, tafsirChosen: true, tafsirId: 21 }),
    );

    expect(selectedResourceIds(resources)).toContain(21);
  });

  it('uses the saved ids when the reader has chosen', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([99, 100]));

    expect(selectedResourceIds(resources)).toEqual([99, 100]);
  });

  it('installs an azkar resource that the manifest lists, with no user choice', () => {
    const listed = [...resources, resource({ id: 40, group: 'azkar' })];

    expect(defaultSelectedResourceIds(listed)).toEqual([1, 2, 30, 40]);
    expect(selectedResourceIds(listed)).toEqual([1, 2, 30, 40]);
  });

  it('keeps an azkar resource selected alongside a saved selection', () => {
    const listed = [...resources, resource({ id: 40, group: 'azkar' })];
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([99, 100]));

    expect(selectedResourceIds(listed)).toEqual([99, 100, 40]);
  });

  it('never selects azkar when the manifest does not list it', () => {
    expect(defaultSelectedResourceIds(resources)).toEqual([1, 2, 30]);
    expect(selectedResourceIds(resources)).toEqual([1, 2, 30]);

    storage.set(storageKeys.selectedResourceIds, JSON.stringify([99]));
    expect(selectedResourceIds(resources)).toEqual([99]);
  });

  it('installs a duas resource that the manifest lists, with no user choice', () => {
    const listed = [...resources, resource({ id: 50, group: 'duas' })];

    expect(defaultSelectedResourceIds(listed)).toEqual([1, 2, 30, 50]);
    expect(selectedResourceIds(listed)).toEqual([1, 2, 30, 50]);
  });

  it('does not auto-select a hadith collection, even when the manifest lists it', () => {
    const listed = [...resources, resource({ id: 40, group: 'hadith_collections' })];

    expect(defaultSelectedResourceIds(listed)).not.toContain(40);
    expect(selectedResourceIds(listed)).not.toContain(40);
    expect(defaultSelectedResourceIds(listed)).toEqual([1, 2, 30]);
  });
});
