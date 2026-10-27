import type { paths } from '@quran/api-contract';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getLocale } from '@/core/i18n';

import { apiBaseUrl } from './base-url';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(status: number, code?: string) {
    super(code === undefined ? `HTTP ${status}` : `HTTP ${status} (${code})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type ApiGetOptions = {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  query?: Record<string, string | number | null | undefined>;
};

export async function apiGet(path: keyof paths, options: ApiGetOptions = {}): Promise<Response> {
  const url = new URL(`${apiBaseUrl()}/api/v1${path}`);
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    search.set(key, String(value));
  }

  const query = search.toString();
  const href = query.length === 0 ? url.href : `${url.href}?${query}`;

  return fetch(href, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': getLocale(),
      'X-Platform': appPlatform(),
      'X-App-Version': appVersion(),
      ...options.headers,
    },
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  });
}

export async function apiError(response: Response): Promise<ApiError> {
  return new ApiError(response.status, await problemCode(response));
}

async function problemCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body !== 'object' || body === null || !('code' in body)) {
      return undefined;
    }
    return typeof body.code === 'string' ? body.code : undefined;
  } catch {
    return undefined;
  }
}

function appPlatform(): 'ios' | 'android' {
  return Platform.OS === 'android' ? 'android' : 'ios';
}

function appVersion(): string {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.length > 0 ? version : '0.0.0';
}
