import { surahRowModel } from './surah-downloads';

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
