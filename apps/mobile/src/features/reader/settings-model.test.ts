import { storage, storageKeys } from '@/core/storage/mmkv';

import { PICKABLE_MUSHAF_KEYS } from './mushafs';
import { defaultReaderSettings, migrateReaderSettings, readReaderSettings, writeReaderSettings } from './settings-model';

describe('reader settings: mushaf', () => {
  beforeEach(() => {
    storage.remove(storageKeys.readerSettings);
  });

  it('defaults to Hafs', () => {
    expect(defaultReaderSettings().mushaf).toBe('hafs');
    expect(readReaderSettings().mushaf).toBe('hafs');
  });

  it.each(PICKABLE_MUSHAF_KEYS)('round-trips %s through the stored blob', (mushaf) => {
    writeReaderSettings({ ...defaultReaderSettings(), mushaf });
    expect(readReaderSettings().mushaf).toBe(mushaf);
  });

  it('reads a saved hidden riwayah (duri) as hafs, without rewriting the stored blob', () => {
    storage.set(storageKeys.readerSettings, JSON.stringify({ mode: 'focus', mushaf: 'duri', version: 1 }));
    expect(readReaderSettings().mushaf).toBe('hafs');
    expect(JSON.parse(storage.getString(storageKeys.readerSettings) ?? '{}')).toMatchObject({ mushaf: 'duri' });
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

describe('mushaf page zoom in the reader settings blob', () => {
  it('reads a blob without a zoom as 1, and a non-number as 1', () => {
    expect(migrateReaderSettings({}).mushafZoom).toBe(1);
    expect(migrateReaderSettings({ mushafZoom: 'big' }).mushafZoom).toBe(1);
  });

  it('snaps a stored zoom to 25% steps and clamps it to [1, 3]', () => {
    expect(migrateReaderSettings({ mushafZoom: 1.37 }).mushafZoom).toBe(1.25);
    expect(migrateReaderSettings({ mushafZoom: 5 }).mushafZoom).toBe(3);
    expect(migrateReaderSettings({ mushafZoom: 0.4 }).mushafZoom).toBe(1);
  });

  it('keeps fontScale apart from the zoom', () => {
    expect(migrateReaderSettings({ fontScale: 1.3, mushafZoom: 1.5 })).toMatchObject({ fontScale: 1.3, mushafZoom: 1.5 });
  });
});
