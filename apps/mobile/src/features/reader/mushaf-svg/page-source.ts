// Inflates a stored page and keeps its parsed model in a small LRU (ADR 0090 decision 9). The raw SVG string is dropped
// as soon as it is parsed; only the model stays in the cache.
import type { SvgMushafPackReader } from '@/core/mushaf-pack';
import { gunzipSync, strFromU8 } from 'fflate';

import { parseSvgPage, type SvgPageModel } from './svg-page-model';

/** How many pages' models (and their pictures) stay in memory. */
export const PAGE_MODEL_CACHE = 8;

export class MushafPageMissingError extends Error {}

/** The page's SVG text. Throws on bad gzip data. */
export function inflatePage(gz: Uint8Array): string {
  return strFromU8(gunzipSync(gz));
}

export class PageModelCache {
  private readonly entries = new Map<string, SvgPageModel>();

  constructor(private readonly capacity: number) {}

  get(id: string): SvgPageModel | undefined {
    const model = this.entries.get(id);
    if (model !== undefined) {
      // A hit moves the page to the newest end, so the least recently used page is the first key.
      this.entries.delete(id);
      this.entries.set(id, model);
    }
    return model;
  }

  set(id: string, model: SvgPageModel): void {
    this.entries.delete(id);
    this.entries.set(id, model);
    while (this.entries.size > this.capacity) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.entries.delete(oldest);
    }
  }

  delete(id: string): void {
    this.entries.delete(id);
  }

  clear(): void {
    this.entries.clear();
  }
}

/** The model of a page: from the cache, else inflated, parsed and cached. */
export function loadPageModel(
  reader: SvgMushafPackReader,
  id: string,
  page: number,
  cache: PageModelCache,
): SvgPageModel {
  const cached = cache.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const gz = reader.getPage(page);
  if (gz === null) {
    throw new MushafPageMissingError(`The mushaf pack has no page ${page}.`);
  }
  const model = parseSvgPage(inflatePage(gz));
  cache.set(id, model);
  return model;
}
