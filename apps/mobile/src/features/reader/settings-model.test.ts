import { storage, storageKeys } from '@/core/storage/mmkv';

import { MUSHAF_KEYS } from './mushafs';
import { defaultReaderSettings, migrateReaderSettings, readReaderSettings, writeReaderSettings } from './settings-model';

describe('reader settings: mushaf', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
  });

  it('defaults to Hafs', () => {
    expect(defaultReaderSettings().mushaf).toBe('hafs');
    expect(readReaderSettings().mushaf).toBe('hafs');
  });

  it.each(MUSHAF_KEYS)('round-trips %s through the stored blob', (mushaf) => {
    writeReaderSettings({ ...defaultReaderSettings(), mushaf });
    expect(readReaderSettings().mushaf).toBe(mushaf);
  });

  it.each(['kfgqpc', 'HAFS', 42, null])('reads an unknown mushaf %p as hafs', (mushaf) => {
    expect(migrateReaderSettings({ mode: 'focus', mushaf }).mushaf).toBe('hafs');
  });

  it('reads a blob holding only the old quranFont as hafs, with the other fields intact', () => {
    const settings = migrateReaderSettings({ fontScale: 1.2, mode: 'focus', quranFont: 'scheherazadeNew', version: 1 });
    expect(settings).toMatchObject({ fontScale: 1.2, mode: 'focus', mushaf: 'hafs', tafsirChosen: false });
    expect(settings).not.toHaveProperty('quranFont');
  });

  it('does not write the old quranFont back', () => {
    storage.set(storageKeys.readerSettings, JSON.stringify({ mode: 'focus', quranFont: 'scheherazadeNew', version: 1 }));
    writeReaderSettings(readReaderSettings());
    const stored = JSON.parse(storage.getString(storageKeys.readerSettings) ?? '{}') as Record<string, unknown>;
    expect(stored).not.toHaveProperty('quranFont');
    expect(stored.mushaf).toBe('hafs');
    expect(stored.mode).toBe('focus');
  });
});
