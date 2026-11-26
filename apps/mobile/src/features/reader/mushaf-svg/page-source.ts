import type { SvgMushafPackReader } from '@/core/mushaf-pack';

import { decodeTqp } from './tqp-decoder';
import type { SvgPageModel } from './svg-page-model';

/** How many pages' models (and their pictures) stay in memory. */
export const PAGE_MODEL_CACHE = 12;

export class MushafPageMissingError extends Error {}

export class PageModelCache {
  private readonly entries = new Map<string, SvgPageModel>();

  constructor(private readonly capacity: number) {}

  get(id: string): SvgPageModel | undefined {
    const model = this.entries.get(id);
    if (model !== undefined) {
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

/** The model of a page: from the cache, else decoded from its TQP1 blob (with the pack's viewBox origin) and cached. Throws on a bad blob. */
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
  const stored = reader.getPage(page);
  if (stored === null) {
    throw new MushafPageMissingError(`The mushaf pack has no page ${page}.`);
  }
  // The decoded commands go straight to Skia (buildTqpPath): building and parsing an SVG string cost more on Hermes.
  const model: SvgPageModel = { decoded: decodeTqp(stored.blob), origin: stored.origin, pieces: [], viewBox: { height: 550, width: 345 } };
  cache.set(id, model);
  return model;
}
