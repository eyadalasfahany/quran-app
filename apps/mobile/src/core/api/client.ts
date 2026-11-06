import type { paths } from '@quran/api-contract';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { getLocale } from '@/core/i18n';

import { apiBaseUrl } from './base-url';
import { REQUEST_TIMEOUT_MS, requestSignal } from './request-timeout';

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
  /** The caller's cancel. It combines with the request timeout: either one aborts the request. */
  signal?: AbortSignal;
  query?: Record<string, string | number | null | undefined>;
  timeoutMs?: number;
};

export async function apiGet(path: keyof paths, options: ApiGetOptions = {}): Promise<Response> {
  const href = requestHref(path, options.query);

  // The timeout covers the wait for the response headers. A timeout or an unreachable server throws a NetworkError.
  const request = requestSignal(options.timeoutMs ?? REQUEST_TIMEOUT_MS, options.signal);
  try {
    return await fetch(href, {
      headers: requestHeaders(options.headers),
      signal: request.signal,
    });
  } catch (error) {
    throw request.fail(error);
  } finally {
    request.done();
  }
}

type ApiPostOptions = {
  headers?: Record<string, string>;
  /** The caller's cancel. It combines with the request timeout: either one aborts the request. */
  signal?: AbortSignal;
  timeoutMs?: number;
};

/** A JSON POST to our API. It has the same headers, timeout and NetworkError handling as apiGet. */
export async function apiPost(path: keyof paths, body: unknown, options: ApiPostOptions = {}): Promise<Response> {
  const href = requestHref(path);

  const request = requestSignal(options.timeoutMs ?? REQUEST_TIMEOUT_MS, options.signal);
  try {
    return await fetch(href, {
      body: JSON.stringify(body),
      headers: requestHeaders({ 'Content-Type': 'application/json', ...options.headers }),
      method: 'POST',
      signal: request.signal,
    });
  } catch (error) {
    throw request.fail(error);
  } finally {
    request.done();
  }
}

function requestHref(path: keyof paths, query?: ApiGetOptions['query']): string {
  const url = new URL(`${apiBaseUrl()}/api/v1${path}`);
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    search.set(key, String(value));
  }

  const encoded = search.toString();
  return encoded.length === 0 ? url.href : `${url.href}?${encoded}`;
}

function requestHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Accept: 'application/json',
    'Accept-Language': getLocale(),
    'X-Platform': appPlatform(),
    'X-App-Version': appVersion(),
    ...extra,
  };
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
