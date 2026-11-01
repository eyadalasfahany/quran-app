import { isNetworkError } from '@/core/api/request-timeout';
import { qcfV2FontKeys, storage } from '@/core/storage/mmkv';

import { FONT_FETCH_TIMEOUT_MS, FONT_REVALIDATE_MS, QCF_V2_FONT_HOST } from './constants';
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
// The renames the code made, as [from, to] file names. The atomic write is checked through these.
const mockMoves: [string, string][] = [];
// When set, the next write to a `.part` file is cut short and throws: the app was killed mid-write.
let mockKillNextPartWrite = false;
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
    name: string;
    constructor(_dir: unknown, name: string) {
      this.name = name;
      this.uri = `file:///mock/qcf-v2/${name}`;
    }
    get exists() {
      return mockFontFiles.has(this.uri);
    }
    get size() {
      return mockFontFiles.get(this.uri)?.byteLength ?? 0;
    }
    delete() {
      mockFontFiles.delete(this.uri);
    }
    async write(bytes: Uint8Array) {
      if (this.name.endsWith('.part') && mockKillNextPartWrite) {
        mockKillNextPartWrite = false;
        mockFontFiles.set(this.uri, bytes.slice(0, Math.floor(bytes.byteLength / 2)));
        throw new Error('The app was killed mid-write.');
      }
      mockFontFiles.set(this.uri, bytes);
    }
    async move(destination: MockFile) {
      const bytes = mockFontFiles.get(this.uri);
      if (bytes === undefined) {
        throw new Error('Nothing to move.');
      }
      mockMoves.push([this.name, destination.name]);
      mockFontFiles.set(destination.uri, bytes);
      mockFontFiles.delete(this.uri);
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

const fileUri = (name: string) => `file:///mock/qcf-v2/${name}`;
const STALE_AT = String(Date.now() - FONT_REVALIDATE_MS - 1_000);

function okResponse(bytes: number[], headers: Record<string, string | null> = {}) {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (key: string) => (key in headers ? headers[key] : key === 'ETag' ? '"v1"' : key === 'Last-Modified' ? 'Mon, 01 Jan 2024 00:00:00 GMT' : null),
    },
    arrayBuffer: async () => new Uint8Array(bytes).buffer,
  };
}

// Never answers, but honours its signal the way fetch does.
function hangingFetch(_url: unknown, init?: { signal?: AbortSignal }): Promise<never> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
    });
  });
}

beforeEach(() => {
  mockFontFiles.clear();
  mockLoadedFamilies.clear();
  mockMoves.length = 0;
  mockKillNextPartWrite = false;
  storage.clearAll();
  resetMushafFontsForTests();
  fetchImpl = jest.fn(async () => okResponse([1, 2, 3]));
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
    storage.set(qcfV2FontKeys.revalidatedAt(5), STALE_AT);
    fetchImpl.mockResolvedValueOnce({
      ok: false,
      status: 503,
      headers: { get: () => null },
      arrayBuffer: async () => new ArrayBuffer(0),
    });
    await expect(revalidatePageFonts()).rejects.toThrow(/revalidate/i);
    expect(storage.getString(qcfV2FontKeys.revalidatedAt(5))).toBe(STALE_AT);
  });

  it('skips revalidation within 30 days and sends conditional headers after', async () => {
    await ensurePageFont(3);
    fetchImpl.mockClear();
    storage.set(qcfV2FontKeys.revalidatedAt(3), String(Date.now()));
    await revalidatePageFonts();
    expect(fetchImpl).not.toHaveBeenCalled();

    storage.set(qcfV2FontKeys.revalidatedAt(3), STALE_AT);
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

describe('mushaf page font timeouts', () => {
  it('times out a stalled download as a network error and leaves no partial file', async () => {
    jest.useFakeTimers();
    try {
      fetchImpl.mockImplementationOnce(hangingFetch);

      const pending = ensurePageFont(7).catch((reason: unknown) => reason);
      await jest.advanceTimersByTimeAsync(FONT_FETCH_TIMEOUT_MS);
      const error = await pending;

      expect(isNetworkError(error)).toBe(true);
      expect(error).toMatchObject({ failure: 'timeout' });
      expect(mockFontFiles.has(fileUri('p7.ttf'))).toBe(false);
      expect(mockFontFiles.has(fileUri('p7.ttf.part'))).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('mushaf page font atomic writes', () => {
  it('writes to p{N}.ttf.part and renames it over p{N}.ttf once the bytes are complete', async () => {
    await ensurePageFont(2);

    expect(mockMoves).toEqual([['p2.ttf.part', 'p2.ttf']]);
    expect(mockFontFiles.get(fileUri('p2.ttf'))).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockFontFiles.has(fileUri('p2.ttf.part'))).toBe(false);
  });

  it('keeps the old file whole when the app is killed mid-write, and does not stamp the revalidation', async () => {
    await ensurePageFont(4);
    storage.set(qcfV2FontKeys.revalidatedAt(4), STALE_AT);
    storage.set(qcfV2FontKeys.etag(4), '"v1"');
    fetchImpl.mockResolvedValueOnce(okResponse([9, 9, 9, 9], { ETag: '"v2"' }));
    mockKillNextPartWrite = true;

    await expect(revalidatePageFonts()).rejects.toThrow(/killed/i);

    expect(mockFontFiles.get(fileUri('p4.ttf'))).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockFontFiles.has(fileUri('p4.ttf.part'))).toBe(false);
    expect(storage.getString(qcfV2FontKeys.revalidatedAt(4))).toBe(STALE_AT);
    expect(storage.getString(qcfV2FontKeys.etag(4))).toBe('"v1"');
  });

  it('stamps the revalidation and the new ETag only after the rename succeeds', async () => {
    await ensurePageFont(3);
    storage.set(qcfV2FontKeys.revalidatedAt(3), STALE_AT);
    fetchImpl.mockResolvedValueOnce(okResponse([7, 7], { ETag: '"v2"' }));
    const now = Date.now();

    await revalidatePageFonts(now);

    expect(mockFontFiles.get(fileUri('p3.ttf'))).toEqual(new Uint8Array([7, 7]));
    expect(storage.getString(qcfV2FontKeys.revalidatedAt(3))).toBe(String(now));
    expect(storage.getString(qcfV2FontKeys.etag(3))).toBe('"v2"');
  });

  it('rejects a body shorter than its Content-Length and writes nothing', async () => {
    fetchImpl.mockResolvedValueOnce(okResponse([1, 2, 3], { 'Content-Length': '10' }));

    await expect(ensurePageFont(5)).rejects.toThrow(/incomplete/i);

    expect(mockFontFiles.has(fileUri('p5.ttf'))).toBe(false);
    expect(mockFontFiles.has(fileUri('p5.ttf.part'))).toBe(false);
  });

  it('accepts a body whose length matches its Content-Length', async () => {
    fetchImpl.mockResolvedValueOnce(okResponse([1, 2, 3], { 'Content-Length': '3' }));

    await ensurePageFont(5);

    expect(mockFontFiles.get(fileUri('p5.ttf'))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('treats a zero-size file as missing and downloads it again', async () => {
    mockFontFiles.set(fileUri('p6.ttf'), new Uint8Array(0));

    await ensurePageFont(6);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(mockFontFiles.get(fileUri('p6.ttf'))).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('treats a leftover .part from an earlier kill as missing, and keeps the good file until the new one is whole', async () => {
    mockFontFiles.set(fileUri('p8.ttf'), new Uint8Array([5, 5]));
    mockFontFiles.set(fileUri('p8.ttf.part'), new Uint8Array([1]));

    await ensurePageFont(8);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(mockFontFiles.get(fileUri('p8.ttf'))).toEqual(new Uint8Array([1, 2, 3]));
    expect(mockFontFiles.has(fileUri('p8.ttf.part'))).toBe(false);
  });

  it('keeps a usable file as it is, with no request', async () => {
    mockFontFiles.set(fileUri('p9.ttf'), new Uint8Array([4, 4]));

    await ensurePageFont(9);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(isPageFontLoaded(9)).toBe(true);
  });
});

describe('mushaf page font revalidation backoff', () => {
  it('stops at the first network error and makes no further requests for the session', async () => {
    for (const page of [1, 2, 3, 4, 5]) {
      mockFontFiles.set(fileUri(`p${page}.ttf`), new Uint8Array([page]));
    }
    fetchImpl.mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(revalidatePageFonts()).rejects.toMatchObject({ kind: 'network' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await expect(revalidatePageFonts()).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fetches nothing when every cached font is still inside its 30 days', async () => {
    for (const page of [1, 2]) {
      mockFontFiles.set(fileUri(`p${page}.ttf`), new Uint8Array([page]));
      storage.set(qcfV2FontKeys.revalidatedAt(page), String(Date.now()));
    }

    await revalidatePageFonts();

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
