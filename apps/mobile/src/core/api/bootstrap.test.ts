import type { BootstrapResponse } from '@quran/api-contract';

import { getBootstrap } from '@/core/api';
import { storage, storageKeys } from '@/core/storage/mmkv';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.1' },
  },
}));

const bootstrap: BootstrapResponse = {
  min_app_version: { ios: '1.0.2', android: null },
  store_url: {
    ios: 'https://apps.apple.com/app/id6828097265',
    android: 'https://play.google.com/store/apps/details?id=com.taybahapp.taybah',
  },
};

describe('getBootstrap', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:8000';
    storage.set(storageKeys.locale, 'ar');
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
    jest.restoreAllMocks();
  });

  it('returns the body on 200', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(bootstrap), { status: 200 }));

    await expect(getBootstrap()).resolves.toEqual(bootstrap);
  });

  it('rejects on 500', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ type: 'about:blank', status: 500 }), { status: 500 }));

    await expect(getBootstrap()).rejects.toThrow('HTTP 500');
  });
});
