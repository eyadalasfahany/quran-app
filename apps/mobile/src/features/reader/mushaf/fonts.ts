import * as Font from 'expo-font';
import { Directory, File, Paths } from 'expo-file-system';

import { isNetworkError, requestSignal } from '@/core/api/request-timeout';
import { qcfV2FontKeys, storage } from '@/core/storage/mmkv';

import {
  FONT_FETCH_TIMEOUT_MS,
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

/** A font response whose body arrived. `contentLength` is null when the server did not send the header. */
type FontResponse = {
  bytes: Uint8Array;
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
};

type FetchedFont = { kind: 'ok'; font: FontResponse } | { kind: 'not-modified' } | { kind: 'failed' };

const inflight = new Map<number, Promise<string>>();
const loadedFamilies = new Set<string>();
let viewportPage = 1;
let downloadAll: DownloadAllState | null = null;
/** expo-font 58 exposes unloadAsync on web only. Native calls reject with ERR_UNAVAILABLE. */
let fontUnloadAvailable = true;
/** Set when a revalidation run hits a network error. The session stops asking the CDN; the cached fonts keep working. */
let revalidationBackedOff = false;

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
  if (await unloadLoadedFamily(family)) {
    loadedFamilies.delete(family);
  }
}

/**
 * Revalidates the cached fonts, one page at a time. The first network error ends the run and backs off the rest of
 * the session, so an offline launch makes one request, not 604. Other errors end the run but are tried again later.
 */
export async function revalidatePageFonts(now = Date.now()): Promise<void> {
  if (revalidationBackedOff) {
    return;
  }
  for (let page = 1; page <= MUSHAF_PAGE_COUNT; page += 1) {
    if (shouldSkipRevalidation(page, now) || !fontFile(page).exists) {
      continue;
    }
    try {
      await revalidatePageFont(page, now);
    } catch (error) {
      if (isNetworkError(error)) {
        revalidationBackedOff = true;
      }
      throw error;
    }
  }
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

/**
 * The sub-path inside `Paths.document` where QCF v2 font files are stored.
 * Used by measurement hooks that scan the directory without loading fonts.
 */
export function fontDirectoryPath(): string {
  return 'qcf-v2';
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

/** A file is usable when it has bytes and no unfinished `.part` sits beside it. Otherwise it is missing. */
function isUsablePageFontFile(page: number): boolean {
  const file = fontFile(page);
  return file.exists && file.size > 0 && !partFile(page).exists;
}

async function ensurePageFontFile(page: number): Promise<string> {
  ensureFontDirectory();
  if (!isUsablePageFontFile(page)) {
    await downloadPageFont(page);
  }
  return fontFile(page).uri;
}

async function downloadPageFont(page: number): Promise<void> {
  const fetched = await fetchFont(page);
  if (fetched.kind !== 'ok') {
    throw new Error(`Could not download mushaf page font ${page}.`);
  }
  await storeFont(page, fetched.font);
  storeResponseMetadata(page, fetched.font);
}

async function revalidatePageFont(page: number, now: number): Promise<void> {
  const fetched = await fetchFont(page, conditionalHeaders(page));
  if (fetched.kind === 'not-modified') {
    storage.set(qcfV2FontKeys.revalidatedAt(page), String(now));
    return;
  }
  if (fetched.kind !== 'ok') {
    throw new Error(`Could not revalidate mushaf page font ${page}.`);
  }
  await storeFont(page, fetched.font);
  // Only a font that is now on disk counts as revalidated.
  storeResponseMetadata(page, fetched.font);
  storage.set(qcfV2FontKeys.revalidatedAt(page), String(now));
  await reloadLoadedFamily(page);
}

/** Fetches one page font with the request timeout. A timeout or an unreachable server throws a NetworkError. */
async function fetchFont(page: number, headers: HeadersInit = {}): Promise<FetchedFont> {
  const url = pageFontUrl(page);
  assertQfFontUrl(url);
  const request = requestSignal(FONT_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: request.signal });
    if (response.status === 304) {
      return { kind: 'not-modified' };
    }
    if (!response.ok) {
      return { kind: 'failed' };
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      kind: 'ok',
      font: {
        bytes,
        contentLength: parseContentLength(response.headers.get('Content-Length')),
        etag: response.headers.get('ETag'),
        lastModified: response.headers.get('Last-Modified'),
      },
    };
  } catch (error) {
    throw request.fail(error);
  } finally {
    request.done();
  }
}

/**
 * Writes the font to `p{N}.ttf.part`, checks its size, then renames it over `p{N}.ttf`. The good file is untouched
 * until the new bytes are complete. A failure removes the partial file and leaves the old one as it was.
 */
async function storeFont(page: number, font: FontResponse): Promise<void> {
  const { bytes, contentLength } = font;
  if (bytes.byteLength === 0) {
    throw new Error(`Mushaf page font ${page} arrived empty.`);
  }
  if (contentLength !== null && contentLength !== bytes.byteLength) {
    throw new Error(`Mushaf page font ${page} arrived incomplete.`);
  }
  ensureFontDirectory();
  const part = partFile(page);
  if (part.exists) {
    part.delete();
  }
  try {
    await part.write(bytes);
    if (part.size !== bytes.byteLength) {
      throw new Error(`Mushaf page font ${page} was written incomplete.`);
    }
    await part.move(fontFile(page), { overwrite: true });
  } catch (error) {
    if (part.exists) {
      part.delete();
    }
    throw error;
  }
}

/** Replaces a page font that expo-font already has registered, so the new bytes are used this session. */
async function reloadLoadedFamily(page: number): Promise<void> {
  const family = fontFamilyForPage(page);
  if (!loadedFamilies.has(family)) {
    return;
  }
  if (await unloadLoadedFamily(family)) {
    loadedFamilies.delete(family);
  }
  await Font.loadAsync({ [family]: fontFile(page).uri });
  loadedFamilies.add(family);
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

function storeResponseMetadata(page: number, font: FontResponse): void {
  if (font.etag !== null) {
    storage.set(qcfV2FontKeys.etag(page), font.etag);
  }
  if (font.lastModified !== null) {
    storage.set(qcfV2FontKeys.lastModified(page), font.lastModified);
  }
}

function parseContentLength(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const length = Number(header);
  return Number.isInteger(length) && length >= 0 ? length : null;
}

function fontFile(page: number): File {
  return new File(fontDirectory(), `p${page}.ttf`);
}

function partFile(page: number): File {
  return new File(fontDirectory(), `p${page}.ttf.part`);
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

async function unloadLoadedFamily(family: string): Promise<boolean> {
  if (!fontUnloadAvailable) {
    return false;
  }
  try {
    await Font.unloadAsync(family);
    return true;
  } catch (error) {
    if (isFontUnloadUnavailable(error)) {
      fontUnloadAvailable = false;
      return false;
    }
    throw error;
  }
}

function isFontUnloadUnavailable(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_UNAVAILABLE';
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
  fontUnloadAvailable = true;
  revalidationBackedOff = false;
  downloadAll?.abort.abort();
  downloadAll = null;
}

export function mushafFontViewportForTests(): number {
  return viewportPage;
}
