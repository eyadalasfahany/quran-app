import type { ContentChangesPage, ContentManifest } from '@quran/api-contract';
import { Platform } from 'react-native';

import { ApiError, getChanges, getManifest, isNetworkError, packUrl, REQUEST_TIMEOUT_MS } from '@/core/api';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.2.3' },
  },
}));

const manifest: ContentManifest = {
  generated_at: '2026-10-27T00:00:00.000Z',
  pack_schema_version: 1,
  resources: [],
};

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

// Never answers, but honours its signal the way fetch does.
function hangingFetch(_input: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }));
    });
  });
}

describe('content api', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    storage.set(storageKeys.locale, 'ar');
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = originalUrl;
    }
    storage.remove(storageKeys.locale);
    jest.restoreAllMocks();
  });

  it('sends the content headers and If-None-Match', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(200, manifest, { ETag: '"abc"' }),
    );

    await getManifest('"abc"');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/content/manifest',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'ar',
          'X-Platform': Platform.OS === 'android' ? 'android' : 'ios',
          'X-App-Version': '1.2.3',
          'If-None-Match': '"abc"',
        },
      }),
    );
  });

  it('returns the manifest and etag on 200', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, manifest, { ETag: '"abc"' }));

    await expect(getManifest()).resolves.toEqual({ status: 200, etag: '"abc"', manifest });
  });

  it('returns 304 without reading a body', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 304, headers: { ETag: '"abc"' } }));

    await expect(getManifest('"abc"')).resolves.toEqual({ status: 304 });
  });

  it('throws ApiError with the problem code for any other manifest status', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(500, { type: 'about:blank', title: 'Error', status: 500, code: 'server_error' }),
    );

    const error = await getManifest().then(
      () => undefined,
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, code: 'server_error' });
  });

  it('pages changes and returns 410 without throwing', async () => {
    const page: ContentChangesPage = { data: [], next_cursor: null };
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(200, page))
      .mockResolvedValueOnce(
        jsonResponse(410, { type: 'about:blank', title: 'Gone', status: 410, code: 'changes_gone' }),
      );

    await expect(getChanges({ resourceId: 85, sinceVersion: 2, cursor: 'cursor-1', limit: 50 })).resolves.toEqual({
      status: 200,
      page,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/content/changes?resource_id=85&since_version=2&cursor=cursor-1&limit=50',
      expect.any(Object),
    );

    await expect(getChanges({ resourceId: 85, sinceVersion: 2 })).resolves.toEqual({ status: 410 });
  });

  it('resolves a relative pack url against the API base', () => {
    expect(packUrl('/api/v1/content/packs/85/2')).toBe('http://localhost:8000/api/v1/content/packs/85/2');
    expect(packUrl('https://cdn.example/pack.sqlite.gz')).toBe('https://cdn.example/pack.sqlite.gz');
  });

  it('aborts the request when the caller cancels, and that is not a network error', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch);
    const controller = new AbortController();

    const pending = getManifest(undefined, controller.signal);
    controller.abort();

    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(true);
    const error = await pending.catch((reason: unknown) => reason);
    expect(isNetworkError(error)).toBe(false);
    expect((error as { name?: string }).name).toBe('AbortError');
  });

  it('times out a request that never answers, as a typed network error', async () => {
    jest.useFakeTimers();
    try {
      jest.spyOn(globalThis, 'fetch').mockImplementation(hangingFetch);

      const pending = getManifest().catch((reason: unknown) => reason);
      await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
      const error = await pending;

      expect(isNetworkError(error)).toBe(true);
      expect(error).toMatchObject({ failure: 'timeout', kind: 'network' });
    } finally {
      jest.useRealTimers();
    }
  });

  it('reports an unreachable server as a network error, not a crash', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    const error = await getManifest().catch((reason: unknown) => reason);

    expect(error).toMatchObject({ failure: 'unreachable', kind: 'network' });
  });
});
