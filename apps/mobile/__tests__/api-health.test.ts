import type { HealthResponse } from '@quran/api-contract';

import { apiBaseUrl, fetchHealth } from '@/core/api';

const ok: HealthResponse = {
  status: 'ok',
  time: '2026-10-27T09:30:00.123Z',
  checks: { database: true, redis: true },
};

const unavailable: HealthResponse = {
  status: 'unavailable',
  time: '2026-10-27T09:30:00.123Z',
  checks: { database: false, redis: true },
};

function respondWith(status: number, body: unknown): jest.SpyInstance {
  return jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('fetchHealth', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calls the v1 health route on the given base URL', async () => {
    const fetchMock = respondWith(200, ok);

    await fetchHealth('http://localhost:8000');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/health',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns the report when every check passes', async () => {
    respondWith(200, ok);

    await expect(fetchHealth('http://api.test')).resolves.toEqual(ok);
  });

  it('returns the report on 503, so the app can show which check failed', async () => {
    respondWith(503, unavailable);

    const health = await fetchHealth('http://api.test');

    expect(health.status).toBe('unavailable');
    expect(health.checks.database).toBe(false);
  });

  it('throws on any other status', async () => {
    respondWith(500, { type: 'about:blank', status: 500 });

    await expect(fetchHealth('http://api.test')).rejects.toThrow('GET /health failed with 500');
  });
});

describe('apiBaseUrl', () => {
  const original = process.env.EXPO_PUBLIC_API_URL;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = original;
    }
  });

  it('drops trailing slashes', () => {
    process.env.EXPO_PUBLIC_API_URL = 'http://10.0.2.2:8000/';

    expect(apiBaseUrl()).toBe('http://10.0.2.2:8000');
  });

  it('fails clearly when the variable is missing', () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    expect(() => apiBaseUrl()).toThrow('EXPO_PUBLIC_API_URL is not set');
  });

  it('fails clearly when the scheme is missing', () => {
    process.env.EXPO_PUBLIC_API_URL = 'app.taybah-app.com';

    expect(() => apiBaseUrl()).toThrow('must start with http:// or https://');
  });

  it('accepts an https URL', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://app.taybah-app.com';

    expect(apiBaseUrl()).toBe('https://app.taybah-app.com');
  });
});
