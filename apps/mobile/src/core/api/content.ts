import type { ContentChangesPage, ContentManifest, paths } from '@quran/api-contract';

import { apiBaseUrl } from './base-url';
import { apiError, apiGet } from './client';

const MANIFEST_PATH = '/content/manifest' satisfies keyof paths;
const CHANGES_PATH = '/content/changes' satisfies keyof paths;

export type ManifestResult = { status: 304 } | { status: 200; etag: string; manifest: ContentManifest };

export type ChangesResult = { status: 200; page: ContentChangesPage } | { status: 410 };

export type ChangesQuery = {
  resourceId: number;
  sinceVersion: number;
  cursor?: string | null;
  limit?: number;
};

// The signal is the caller's cancel; the request timeout applies on top of it.
export async function getManifest(etag?: string, signal?: AbortSignal): Promise<ManifestResult> {
  const headers: Record<string, string> = {};
  if (etag !== undefined && etag.length > 0) {
    headers['If-None-Match'] = etag;
  }

  const response = await apiGet(MANIFEST_PATH, { headers, signal });
  if (response.status === 304) {
    return { status: 304 };
  }
  if (response.status !== 200) {
    throw await apiError(response);
  }

  const header = response.headers.get('etag');
  if (header === null || header.length === 0) {
    throw await apiError(response);
  }

  return {
    status: 200,
    etag: header,
    manifest: (await response.json()) as ContentManifest,
  };
}

export async function getChanges(query: ChangesQuery): Promise<ChangesResult> {
  const response = await apiGet(CHANGES_PATH, {
    query: {
      resource_id: query.resourceId,
      since_version: query.sinceVersion,
      cursor: query.cursor,
      limit: query.limit,
    },
  });

  if (response.status === 200) {
    return { status: 200, page: (await response.json()) as ContentChangesPage };
  }
  if (response.status === 410) {
    return { status: 410 };
  }

  throw await apiError(response);
}

export function packUrl(path: string, baseUrl: string = apiBaseUrl()): string {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path, base).href;
}
