import type { ContentManifestResource } from '@quran/api-contract';

import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';
import { selectedResourceIds } from '@/core/sync/selection';

import { persistResourceChoice, resetReaderSettingsStore, useReaderSettings } from './settings';
import { readReaderSettings } from './settings-model';

function resource(
  overrides: Partial<ContentManifestResource> & Pick<ContentManifestResource, 'id' | 'group'>,
): ContentManifestResource {
  return {
    author_name: null,
    changes_since_min_version: 1,
    direction: null,
    language_code: null,
    name: null,
    name_ar: null,
    pack: { sha256: 'abc', size_bytes: 1, url: '/api/v1/content/packs/1/1' },
    version: 1,
    ...overrides,
  };
}

const resources: ContentManifestResource[] = [
  resource({ group: 'mushafs', id: 1 }),
  resource({ group: 'tafsirs', id: 21, language_code: 'ar' }),
  resource({ group: 'chapter_recitations', id: 30 }),
];

function fakeDb(): { db: SqlExecutor; sql: string[] } {
  const sql: string[] = [];
  return {
    db: {
      all: () => [],
      exec: () => undefined,
      get: () => undefined,
      run: (statement) => {
        sql.push(statement);
      },
      transaction: (fn) => fn(),
    },
    sql,
  };
}

describe('reader settings', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
    storage.remove(storageKeys.selectedResourceIds);
    storage.remove(storageKeys.appearance);
    storage.remove(storageKeys.locale);
    resetReaderSettingsStore();
  });

  it('starts from defaults when nothing is stored', () => {
    expect(useReaderSettings.getState().mode).toBe('reading');
    expect(useReaderSettings.getState().fontScale).toBe(1);
    expect(useReaderSettings.getState().tafsirId).toBeNull();
    expect(useReaderSettings.getState().tafsirChosen).toBe(false);
    expect(readReaderSettings().mode).toBe('reading');
  });

  it('round-trips through MMKV', () => {
    useReaderSettings.getState().setMode('focus');
    useReaderSettings.getState().setFontScale(1.2);
    resetReaderSettingsStore();

    expect(useReaderSettings.getState().mode).toBe('focus');
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
  });

  it('migrates an older blob and clamps font scale', () => {
    storage.set(storageKeys.readerSettings, JSON.stringify({ fontScale: 2.5, mode: 'mushaf', version: 0 }));
    resetReaderSettingsStore();
    expect(useReaderSettings.getState().fontScale).toBe(1.6);
    expect(useReaderSettings.getState().mode).toBe('mushaf');

    useReaderSettings.getState().setFontScale(0.74);
    expect(useReaderSettings.getState().fontScale).toBe(0.8);
    useReaderSettings.getState().setFontScale(1.24);
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
  });

  it('loads a blob that still carries the removed translation fields and drops them on the next write', () => {
    storage.set(
      storageKeys.readerSettings,
      JSON.stringify({
        fontScale: 1.2,
        mode: 'focus',
        showTranslations: true,
        tafsirChosen: true,
        tafsirId: 21,
        translationIds: [11, 12],
        version: 1,
      }),
    );

    expect(() => resetReaderSettingsStore()).not.toThrow();
    expect(useReaderSettings.getState().mode).toBe('focus');
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
    expect(useReaderSettings.getState().tafsirChosen).toBe(true);
    expect(useReaderSettings.getState().tafsirId).toBe(21);

    useReaderSettings.getState().setFontScale(1.3);

    expect(JSON.parse(storage.getString(storageKeys.readerSettings) ?? '{}')).toEqual({
      fontScale: 1.3,
      mode: 'focus',
      tafsirChosen: true,
      tafsirId: 21,
      version: 1,
    });
  });

  it('ignores a corrupt blob', () => {
    storage.set(storageKeys.readerSettings, '{');
    resetReaderSettingsStore();
    expect(useReaderSettings.getState().mode).toBe('reading');
  });

  it('leaves the sync selection alone when the mode or font scale changes', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 21, 30]));

    useReaderSettings.getState().setMode('mushaf');
    useReaderSettings.getState().setFontScale(1.2);

    expect(selectedResourceIds(resources)).toEqual([1, 21, 30]);
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
  });

  it('replaces the chosen tafsir on read', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 21, 30]));

    useReaderSettings.getState().setTafsirId(99);

    expect(selectedResourceIds(resources)).toEqual([1, 30, 99]);
  });

  it('replaces the tafsir in the saved sync selection and clears the manifest etag', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 21, 30]));
    const { db, sql } = fakeDb();

    persistResourceChoice({ tafsirChosen: true, tafsirId: 21 }, { tafsirChosen: true, tafsirId: 99 }, db);

    expect(selectedResourceIds(resources)).toEqual([1, 30, 99]);
    expect(sql).toEqual(['DELETE FROM meta WHERE key = ?']);
  });
});
