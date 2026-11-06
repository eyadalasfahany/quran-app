import { NetworkError } from '@/core/api';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { sendSuggestion } from './send-suggestion';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.1' } } }));

const draft = { name: 'أحمد', email: 'ahmad@example.com', message: 'نص تجريبي ١ — ليس اقتراحًا', locale: 'ar' as const };

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' }, status });
}

describe('sendSuggestion', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    storage.set(storageKeys.locale, 'ar');
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
    jest.restoreAllMocks();
  });

  function sentBody(fetchSpy: jest.SpyInstance): Record<string, unknown> {
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    return JSON.parse(init.body as string) as Record<string, unknown>;
  }

  it('posts to /suggestions with source app, an empty honeypot and the locale', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(202, { status: 'received' }));

    await sendSuggestion(draft);

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/api/v1/suggestions');
    expect(init.method).toBe('POST');
    expect(sentBody(fetchSpy)).toEqual({
      name: 'أحمد',
      email: 'ahmad@example.com',
      message: 'نص تجريبي ١ — ليس اقتراحًا',
      locale: 'ar',
      source: 'app',
      website: '',
    });
  });

  it('leaves out the name when it is empty or only spaces', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));

    await sendSuggestion({ ...draft, name: '   ', locale: 'en' });

    expect(sentBody(fetchSpy)).not.toHaveProperty('name');
    expect(sentBody(fetchSpy).locale).toBe('en');
  });

  it('maps 202 to sent', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 202 }));

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'sent' });
  });

  it('maps 422 to invalid with the first message for each field', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(422, {
        message: 'The given data was invalid.',
        errors: { email: ['FIRST email message', 'second'], message: ['FIRST message'] },
      }),
    );

    await expect(sendSuggestion(draft)).resolves.toEqual({
      kind: 'invalid',
      errors: { email: 'FIRST email message', message: 'FIRST message' },
    });
  });

  it('maps a 422 whose body cannot be read to failed', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('not json', { status: 422 }));

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'failed' });
  });

  it('maps 429 to limited', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(429, { code: 'rate_limited' }));

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'limited' });
  });

  it('maps a network failure to offline', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network request failed'));

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'offline' });
  });

  it('maps a timeout to offline', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      throw new NetworkError('timeout');
    });

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'offline' });
  });

  it('maps a 500 to failed', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(500, { status: 500 }));

    await expect(sendSuggestion(draft)).resolves.toEqual({ kind: 'failed' });
  });
});
