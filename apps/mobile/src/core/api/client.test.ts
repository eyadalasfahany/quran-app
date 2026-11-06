import { apiPost, NetworkError } from '@/core/api';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.1' },
  },
}));

describe('apiPost', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    storage.set(storageKeys.locale, 'en');
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
    jest.restoreAllMocks();
  });

  it('posts the JSON body with the app headers', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));

    const response = await apiPost('/suggestions', { email: 'a@example.com' });

    expect(response.status).toBe(202);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/api/v1/suggestions');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ email: 'a@example.com' }));
    const headers = init.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Accept).toBe('application/json');
    expect(headers['Accept-Language']).toBe('en');
    expect(headers['X-Platform']).toMatch(/^(ios|android)$/);
    expect(headers['X-App-Version']).toBe('1.0.1');
  });

  it('returns a 422 response without throwing, so the caller reads its errors', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ errors: {} }), { status: 422 }));

    const response = await apiPost('/suggestions', {});

    expect(response.status).toBe(422);
  });

  it('throws a NetworkError when the server cannot be reached', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiPost('/suggestions', {})).rejects.toBeInstanceOf(NetworkError);
  });
});
