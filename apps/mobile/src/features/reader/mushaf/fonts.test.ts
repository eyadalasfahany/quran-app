import { qcfV2FontKeys, storage } from '@/core/storage/mmkv';

import { QCF_V2_FONT_HOST } from './constants';
import {
  downloadAllPageFonts,
  ensurePageFont,
  fontFamilyForPage,
  isPageFontLoaded,
  mushafFontViewportForTests,
  pageFontUrl,
  revalidatePageFonts,
  resetMushafFontsForTests,
  setMushafFontViewport,
} from './fonts';

const mockFontFiles = new Map<string, Uint8Array>();
const mockLoadedFamilies = new Set<string>();
let fetchImpl: jest.Mock;

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(async (map: Record<string, string>) => {
    for (const family of Object.keys(map)) {
      mockLoadedFamilies.add(family);
    }
  }),
  unloadAsync: jest.fn(async (family: string) => {
    mockLoadedFamilies.delete(family);
  }),
}));

jest.mock('expo-file-system', () => {
  class MockFile {
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///mock/qcf-v2/${name}`;
    }
    get exists() {
      return mockFontFiles.has(this.uri);
    }
    delete() {
      mockFontFiles.delete(this.uri);
    }
    write(bytes: Uint8Array) {
      mockFontFiles.set(this.uri, bytes);
      return Promise.resolve();
    }
  }
  class MockDirectory {
    exists = true;
    create = jest.fn();
  }
  return {
    Directory: MockDirectory,
    File: MockFile,
    Paths: { document: 'file:///mock/documents' },
  };
});

beforeEach(() => {
  mockFontFiles.clear();
  mockLoadedFamilies.clear();
  storage.clearAll();
  resetMushafFontsForTests();
  fetchImpl = jest.fn(async () => ({
    ok: true,
    status: 200,
    headers: {
      get: (key: string) => (key === 'ETag' ? '"v1"' : key === 'Last-Modified' ? 'Mon, 01 Jan 2024 00:00:00 GMT' : null),
    },
    arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
  }));
  globalThis.fetch = fetchImpl as unknown as typeof fetch;
});

describe('mushaf page fonts', () => {
  it('builds QF URLs for pages 1 and 604 on the public host', () => {
    expect(pageFontUrl(1)).toBe(`https://${QCF_V2_FONT_HOST}/fonts/quran/hafs/v2/ttf/p1.ttf`);
    expect(pageFontUrl(604)).toBe(`https://${QCF_V2_FONT_HOST}/fonts/quran/hafs/v2/ttf/p604.ttf`);
    expect(new URL(pageFontUrl(50)).hostname).toBe(QCF_V2_FONT_HOST);
  });

  it('deduplicates concurrent downloads for the same page', async () => {
    const first = ensurePageFont(1);
    const second = ensurePageFont(1);
    await Promise.all([first, second]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(isPageFontLoaded(1)).toBe(true);
  });

  it('prefetches within ±2 and releases fonts beyond ten pages', async () => {
    mockFontFiles.set('file:///mock/qcf-v2/p1.ttf', new Uint8Array([1]));
    for (let page = 13; page <= 17; page += 1) {
      mockFontFiles.set(`file:///mock/qcf-v2/p${page}.ttf`, new Uint8Array([page]));
    }
    await ensurePageFont(1);
    await ensurePageFont(15);
    expect(isPageFontLoaded(1)).toBe(true);
    expect(isPageFontLoaded(15)).toBe(true);

    setMushafFontViewport(15);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mushafFontViewportForTests()).toBe(15);
    for (const page of [13, 14, 15, 16, 17]) {
      expect(isPageFontLoaded(page)).toBe(true);
    }
    expect(isPageFontLoaded(1)).toBe(false);
  });

  it('does not advance revalidation clock on HTTP error responses', async () => {
    await ensurePageFont(5);
    const staleAt = String(Date.now() - 31 * 24 * 60 * 60 * 1000);
    storage.set(qcfV2FontKeys.revalidatedAt(5), staleAt);
    fetchImpl.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await expect(revalidatePageFonts()).rejects.toThrow(/revalidate/i);
    expect(storage.getString(qcfV2FontKeys.revalidatedAt(5))).toBe(staleAt);
  });

  it('skips revalidation within 30 days and sends conditional headers after', async () => {
    await ensurePageFont(3);
    fetchImpl.mockClear();
    storage.set(qcfV2FontKeys.revalidatedAt(3), String(Date.now()));
    await revalidatePageFonts();
    expect(fetchImpl).not.toHaveBeenCalled();

    storage.set(qcfV2FontKeys.revalidatedAt(3), String(Date.now() - 31 * 24 * 60 * 60 * 1000));
    storage.set(qcfV2FontKeys.etag(3), '"cached"');
    storage.set(qcfV2FontKeys.lastModified(3), 'Mon, 01 Jan 2024 00:00:00 GMT');
    fetchImpl.mockResolvedValueOnce({
      ok: true,
      status: 304,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await revalidatePageFonts();
    expect(fetchImpl).toHaveBeenCalledWith(
      pageFontUrl(3),
      expect.objectContaining({
        headers: expect.objectContaining({
          'If-None-Match': '"cached"',
          'If-Modified-Since': 'Mon, 01 Jan 2024 00:00:00 GMT',
        }),
      }),
    );
  });

  it('reports a failed download through ensurePageFont rejection', async () => {
    fetchImpl.mockResolvedValueOnce({ ok: false, status: 500, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(0) });
    await expect(ensurePageFont(99)).rejects.toThrow(/download/i);
    expect(isPageFontLoaded(99)).toBe(false);
    expect(fontFamilyForPage(99)).toBe('qcf-v2-p99');
  });

  it('downloads all pages with progress and supports cancel', async () => {
    const progress: number[] = [];
    const job = downloadAllPageFonts((state) => progress.push(state.completed));
    job.cancel();
    await expect(job.done).rejects.toThrow();
    expect(progress.length).toBeGreaterThan(0);
  });
});
