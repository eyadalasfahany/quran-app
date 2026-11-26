import { storage, storageKeys } from '@/core/storage/mmkv';

import { clearInstalledSvgMushaf, getInstalledSvgMushaf, setInstalledSvgMushaf } from './installed-store';
import type { InstalledSvgMushaf } from './types';

const RECORD: InstalledSvgMushaf = {
  key: 'hafs',
  resourceId: 9,
  version: 2,
  sha256: 'abc',
  sizeBytes: 100,
  hasWordBoxes: false,
  pageFormat: 'tqp1-deflate-n32',
  installedAt: 1_700_000_000_000,
};

describe('installed svg mushaf store', () => {
  beforeEach(() => {
    clearInstalledSvgMushaf('hafs');
    clearInstalledSvgMushaf('warsh');
  });

  it('stores one JSON record per riwayah and reads it back', () => {
    setInstalledSvgMushaf(RECORD);

    expect(storage.getString(storageKeys.svgMushaf.installed('hafs'))).toBe(JSON.stringify(RECORD));
    expect(getInstalledSvgMushaf('hafs')).toEqual(RECORD);
    expect(getInstalledSvgMushaf('warsh')).toBeUndefined();
  });

  it('clears a record', () => {
    setInstalledSvgMushaf(RECORD);
    clearInstalledSvgMushaf('hafs');

    expect(getInstalledSvgMushaf('hafs')).toBeUndefined();
  });

  it('reads malformed JSON as absent', () => {
    storage.set(storageKeys.svgMushaf.installed('hafs'), '{not json');

    expect(getInstalledSvgMushaf('hafs')).toBeUndefined();
  });

  it('reads a record that names another key as absent', () => {
    storage.set(storageKeys.svgMushaf.installed('hafs'), JSON.stringify({ ...RECORD, key: 'warsh' }));

    expect(getInstalledSvgMushaf('hafs')).toBeUndefined();
  });

  it('reads a record from before TQP1 (no page format) as absent, so the Mushaf shows as not installed', () => {
    const { pageFormat: _old, ...schema1 } = RECORD;
    storage.set(storageKeys.svgMushaf.installed('hafs'), JSON.stringify(schema1));

    expect(getInstalledSvgMushaf('hafs')).toBeUndefined();
  });

  it('reads a record with a missing field as absent', () => {
    const { sha256: _omitted, ...partial } = RECORD;
    storage.set(storageKeys.svgMushaf.installed('hafs'), JSON.stringify(partial));

    expect(getInstalledSvgMushaf('hafs')).toBeUndefined();
  });
});
