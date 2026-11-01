import { surahRowModel } from './surah-downloads';

describe('surahRowModel offline and verify states', () => {
  it('says a surah that is not downloaded is not available offline, when the device is offline', () => {
    expect(surahRowModel(undefined, null, { offline: true })).toEqual({ state: 'available', subtitle: { kind: 'offline' } });
  });

  it('shows nothing extra for a surah that is not downloaded while online', () => {
    expect(surahRowModel(undefined, null, { offline: false })).toEqual({ state: 'available', subtitle: null });
  });

  it('asks for one connection to verify a finished download that needs it, in place of its size', () => {
    expect(surahRowModel('done', 5_000_000, { verifyNeeded: true })).toEqual({ state: 'installed', subtitle: { kind: 'verify' } });
  });

  it('keeps the size for a finished download that is verified', () => {
    expect(surahRowModel('done', 5_000_000, { verifyNeeded: false })).toEqual({
      state: 'installed',
      subtitle: { bytes: 5_000_000, kind: 'size' },
    });
  });
});

describe('surahRowModel', () => {
  it('offers the download for a surah with no row', () => {
    expect(surahRowModel(undefined, null)).toEqual({ state: 'available', subtitle: null });
  });

  it('offers the download again for a failed row, with the failure as its subtitle', () => {
    expect(surahRowModel('failed', null)).toEqual({ state: 'available', subtitle: { kind: 'failed' } });
  });

  it.each([
    ['queued', 'queued'],
    ['waiting_wifi', 'waitingWifi'],
    ['paused', 'paused'],
    ['downloading', 'downloading'],
  ] as const)('shows the stop button and bar for %s, with its own subtitle', (status, kind) => {
    expect(surahRowModel(status, null)).toEqual({ state: 'downloading', subtitle: { kind } });
  });

  it('shows an installed surah with its size when the size is known', () => {
    expect(surahRowModel('done', 4_800_000)).toEqual({ state: 'installed', subtitle: { kind: 'size', bytes: 4_800_000 } });
  });

  it('shows an installed surah with no subtitle when the size is unknown or zero', () => {
    expect(surahRowModel('done', null)).toEqual({ state: 'installed', subtitle: null });
    expect(surahRowModel('done', 0)).toEqual({ state: 'installed', subtitle: null });
  });
});
