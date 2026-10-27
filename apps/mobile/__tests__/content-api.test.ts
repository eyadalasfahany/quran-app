import type { ContentChangesPage, ContentManifest } from '@quran/api-contract';
import { Platform } from 'react-native';

import { ApiError, apiGet, getChanges, getManifest, packUrl } from '@/core/api';
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

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/v1/content/manifest', {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'ar',
        'X-Platform': Platform.OS === 'android' ? 'android' : 'ios',
        'X-App-Version': '1.2.3',
        'If-None-Match': '"abc"',
      },
    });
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

  it('forwards an abort signal from apiGet', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(200, manifest));
    const controller = new AbortController();

    await apiGet('/content/manifest', { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/content/manifest',
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
