import * as Font from 'expo-font';
import { Directory, File, Paths } from 'expo-file-system';

import { qcfV2FontKeys, storage } from '@/core/storage/mmkv';

import {
  FONT_PREFETCH_RADIUS,
  FONT_RELEASE_RADIUS,
  FONT_REVALIDATE_MS,
  MUSHAF_PAGE_COUNT,
  QCF_V2_FONT_HOST,
} from './constants';

export type PageFontProgress = {
  completed: number;
  total: number;
};

type DownloadAllState = {
  abort: AbortController;
  promise: Promise<void>;
};

const inflight = new Map<number, Promise<string>>();
const loadedFamilies = new Set<string>();
let viewportPage = 1;
let downloadAll: DownloadAllState | null = null;

export function pageFontUrl(page: number): string {
  return `https://${QCF_V2_FONT_HOST}/fonts/quran/hafs/v2/ttf/p${page}.ttf`;
}

export function fontFamilyForPage(page: number): string {
  return `qcf-v2-p${page}`;
}

export function isPageFontLoaded(page: number): boolean {
  return loadedFamilies.has(fontFamilyForPage(page));
}

export function setMushafFontViewport(page: number): void {
  viewportPage = page;
  for (let offset = -FONT_PREFETCH_RADIUS; offset <= FONT_PREFETCH_RADIUS; offset += 1) {
    const candidate = page + offset;
    if (candidate >= 1 && candidate <= MUSHAF_PAGE_COUNT) {
      void ensurePageFont(candidate);
    }
  }
  for (const loadedPage of pagesWithLoadedFonts()) {
    if (Math.abs(loadedPage - page) > FONT_RELEASE_RADIUS) {
      void releasePageFont(loadedPage);
    }
  }
}

export async function ensurePageFont(page: number): Promise<string> {
  assertValidPage(page);
  const family = fontFamilyForPage(page);
  if (loadedFamilies.has(family)) {
    return family;
  }
  const pending = inflight.get(page);
  if (pending !== undefined) {
    return pending;
  }

  const task = (async () => {
    const path = await ensurePageFontFile(page);
    await Font.loadAsync({ [family]: path });
    loadedFamilies.add(family);
    return family;
  })();

  inflight.set(page, task);
  try {
    return await task;
  } finally {
    inflight.delete(page);
  }
}

export async function releasePageFont(page: number): Promise<void> {
  assertValidPage(page);
  const family = fontFamilyForPage(page);
  if (!loadedFamilies.has(family)) {
    return;
  }
  await Font.unloadAsync(family);
  loadedFamilies.delete(family);
}

export async function revalidatePageFonts(now = Date.now()): Promise<void> {
  const tasks: Promise<void>[] = [];
  for (let page = 1; page <= MUSHAF_PAGE_COUNT; page += 1) {
    if (shouldSkipRevalidation(page, now)) {
      continue;
    }
    const file = fontFile(page);
    if (!file.exists) {
      continue;
    }
    tasks.push(revalidatePageFont(page, now));
  }
  await Promise.all(tasks);
}

export function downloadAllPageFonts(onProgress?: (progress: PageFontProgress) => void): {
  cancel: () => void;
  done: Promise<void>;
} {
  downloadAll?.abort.abort();
  const abort = new AbortController();
  const done = runDownloadAll(abort.signal, onProgress).finally(() => {
    if (downloadAll?.abort === abort) {
      downloadAll = null;
    }
  });
  downloadAll = { abort, promise: done };
  return { cancel: () => abort.abort(), done };
}

async function runDownloadAll(signal: AbortSignal, onProgress?: (progress: PageFontProgress) => void): Promise<void> {
  let completed = 0;
  onProgress?.({ completed, total: MUSHAF_PAGE_COUNT });
  for (let page = 1; page <= MUSHAF_PAGE_COUNT; page += 1) {
    if (signal.aborted) {
      throw new DOMException('Download cancelled.', 'AbortError');
    }
    await ensurePageFontFile(page);
    completed += 1;
    onProgress?.({ completed, total: MUSHAF_PAGE_COUNT });
  }
}

async function ensurePageFontFile(page: number): Promise<string> {
  const file = fontFile(page);
  ensureFontDirectory();
  if (file.exists) {
    return file.uri;
  }
  await downloadPageFont(page);
  return file.uri;
}

async function downloadPageFont(page: number): Promise<void> {
  const url = pageFontUrl(page);
  assertQfFontUrl(url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not download mushaf page font ${page}.`);
  }
  storeResponseMetadata(page, response.headers);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = fontFile(page);
  ensureFontDirectory();
  if (file.exists) {
    file.delete();
  }
  await file.write(bytes);
}

async function revalidatePageFont(page: number, now: number): Promise<void> {
  const url = pageFontUrl(page);
  assertQfFontUrl(url);
  const headers = conditionalHeaders(page);
  const response = await fetch(url, { headers });
  if (response.status === 304) {
    storage.set(qcfV2FontKeys.revalidatedAt(page), String(now));
    return;
  }
  if (!response.ok) {
    throw new Error(`Could not revalidate mushaf page font ${page}.`);
  }
  storage.set(qcfV2FontKeys.revalidatedAt(page), String(now));
  storeResponseMetadata(page, response.headers);
  const bytes = new Uint8Array(await response.arrayBuffer());
  const file = fontFile(page);
  if (file.exists) {
    file.delete();
  }
  await file.write(bytes);
  const family = fontFamilyForPage(page);
  if (loadedFamilies.has(family)) {
    await Font.unloadAsync(family);
    loadedFamilies.delete(family);
    await Font.loadAsync({ [family]: file.uri });
    loadedFamilies.add(family);
  }
}

function shouldSkipRevalidation(page: number, now: number): boolean {
  const raw = storage.getString(qcfV2FontKeys.revalidatedAt(page));
  if (raw === undefined) {
    return false;
  }
  const last = Number(raw);
  return Number.isFinite(last) && now - last < FONT_REVALIDATE_MS;
}

function conditionalHeaders(page: number): HeadersInit {
  const headers: Record<string, string> = {};
  const etag = storage.getString(qcfV2FontKeys.etag(page));
  const lastModified = storage.getString(qcfV2FontKeys.lastModified(page));
  if (etag !== undefined) {
    headers['If-None-Match'] = etag;
  }
  if (lastModified !== undefined) {
    headers['If-Modified-Since'] = lastModified;
  }
  return headers;
}

function storeResponseMetadata(page: number, headers: Headers): void {
  const etag = headers.get('ETag');
  const lastModified = headers.get('Last-Modified');
  if (etag !== null) {
    storage.set(qcfV2FontKeys.etag(page), etag);
  }
  if (lastModified !== null) {
    storage.set(qcfV2FontKeys.lastModified(page), lastModified);
  }
}

function fontFile(page: number): File {
  return new File(fontDirectory(), `p${page}.ttf`);
}

function fontDirectory(): Directory {
  return new Directory(Paths.document, 'qcf-v2');
}

function ensureFontDirectory(): void {
  const directory = fontDirectory();
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
}

function pagesWithLoadedFonts(): number[] {
  const pages: number[] = [];
  for (let page = 1; page <= MUSHAF_PAGE_COUNT; page += 1) {
    if (loadedFamilies.has(fontFamilyForPage(page))) {
      pages.push(page);
    }
  }
  return pages;
}

function assertValidPage(page: number): void {
  if (!Number.isInteger(page) || page < 1 || page > MUSHAF_PAGE_COUNT) {
    throw new Error(`Invalid mushaf page ${page}.`);
  }
}

function assertQfFontUrl(url: string): void {
  const parsed = new URL(url);
  if (parsed.hostname !== QCF_V2_FONT_HOST) {
    throw new Error('Mushaf fonts must load only from verses.quran.foundation.');
  }
}

/** Test hook: reset module state between tests. */
export function resetMushafFontsForTests(): void {
  inflight.clear();
  loadedFamilies.clear();
  viewportPage = 1;
  downloadAll?.abort.abort();
  downloadAll = null;
}

export function mushafFontViewportForTests(): number {
  return viewportPage;
}
