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
    pack: { sha256: 'abc', size_bytes: 1, url: '/api/v1/content/packs/1/1' },
    version: 1,
    ...overrides,
  };
}

const resources: ContentManifestResource[] = [
  resource({ group: 'mushafs', id: 1 }),
  resource({ group: 'translations', id: 11, language_code: 'ar' }),
  resource({ group: 'translations', id: 12, language_code: 'en' }),
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
    expect(useReaderSettings.getState().showTranslations).toBe(true);
    expect(useReaderSettings.getState().translationIds).toEqual([]);
    expect(useReaderSettings.getState().translationsChosen).toBe(false);
    expect(readReaderSettings().mode).toBe('reading');
  });

  it('round-trips through MMKV', () => {
    useReaderSettings.getState().setMode('focus');
    useReaderSettings.getState().setShowTranslations(false);
    resetReaderSettingsStore();

    expect(useReaderSettings.getState().mode).toBe('focus');
    expect(useReaderSettings.getState().showTranslations).toBe(false);
  });

  it('migrates an older blob and clamps font scale', () => {
    storage.set(
      storageKeys.readerSettings,
      JSON.stringify({ fontScale: 2.5, mode: 'mushaf', showTranslations: false, version: 0 }),
    );
    resetReaderSettingsStore();
    expect(useReaderSettings.getState().fontScale).toBe(1.6);
    expect(useReaderSettings.getState().mode).toBe('mushaf');

    useReaderSettings.getState().setFontScale(0.74);
    expect(useReaderSettings.getState().fontScale).toBe(0.8);
    useReaderSettings.getState().setFontScale(1.24);
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
  });

  it('ignores a corrupt blob', () => {
    storage.set(storageKeys.readerSettings, '{');
    resetReaderSettingsStore();
    expect(useReaderSettings.getState().mode).toBe('reading');
  });

  it('applies a chosen translation on read when no selection list is saved', () => {
    storage.set(storageKeys.locale, 'ar');
    useReaderSettings.getState().setTranslationIds([12]);

    expect(selectedResourceIds(resources)).toEqual([1, 21, 30, 12]);
  });

  it('leaves the sync selection alone when the mode or font scale changes', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 11, 21, 30]));

    useReaderSettings.getState().setMode('mushaf');
    useReaderSettings.getState().setFontScale(1.2);

    expect(selectedResourceIds(resources)).toEqual([1, 11, 21, 30]);
    expect(useReaderSettings.getState().fontScale).toBe(1.2);
  });

  it('replaces the chosen tafsir on read', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 11, 21, 30]));

    useReaderSettings.getState().setTafsirId(99);

    expect(selectedResourceIds(resources)).toEqual([1, 11, 30, 99]);
  });

  it('replaces translations in the sync selection and clears the manifest etag', () => {
    storage.set(storageKeys.selectedResourceIds, JSON.stringify([1, 11, 21, 30]));
    const { db, sql } = fakeDb();

    useReaderSettings.getState().setTranslationIds([12]);
    persistResourceChoice(
      { tafsirChosen: false, tafsirId: null, translationIds: [11], translationsChosen: true },
      { tafsirChosen: false, tafsirId: null, translationIds: [12], translationsChosen: true },
      db,
    );

    expect(selectedResourceIds(resources)).toEqual([1, 21, 30, 12]);
    expect(sql).toEqual(['DELETE FROM meta WHERE key = ?']);
  });
});
