// Loads the Madinah pages a list shows: each page's model, regions and word boxes, and its pictures (ADR 0090 decision
// 8). Loads run one page per idle task, nearest first, so a page is never inflated inside a scroll frame.
import type { SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';

import type { SvgMushafKey, SvgMushafPackReader, WordBox } from '@/core/mushaf-pack';

import { buildRegionGeometry, type PageRegionGeometry } from './region-geometry';
import { PagePictureCache } from './page-picture';
import { loadPageModel, PAGE_MODEL_CACHE, PageModelCache } from './page-source';
import type { SvgPageModel } from './svg-page-model';

/** Regions and boxes are small; this many pages' worth stays in memory. */
const PAGE_DATA_CAPACITY = 16;

export type MushafPageLoader = {
  /** Bumps when a page loads or fails: the list uses it to repaint. */
  version: number;
  model: (page: number) => SvgPageModel | null;
  regions: (page: number) => PageRegionGeometry[];
  wordBoxes: (page: number) => WordBox[];
  pictureOf: (page: number, colour: string) => SkPicture | null;
  error: (page: number) => boolean;
  retry: (page: number) => void;
  /** Queues the pages for an idle load, in the order given (nearest first). */
  prefetch: (pages: readonly number[]) => void;
  /** Drops the pictures (on a theme change); the paths stay. */
  clearPictures: () => void;
};

type PageData = { regions: PageRegionGeometry[]; wordBoxes: WordBox[] };

/** The caches of one pack and one riwayah. A new reader or riwayah gets a new one, so nothing is shared. */
class MushafPageState {
  readonly models = new PageModelCache(PAGE_MODEL_CACHE);
  readonly pictures = new PagePictureCache(PAGE_MODEL_CACHE);
  private readonly data = new Map<number, PageData>();
  private readonly failed = new Set<number>();
  private readonly queue: number[] = [];
  private scheduled = false;

  constructor(
    private readonly reader: SvgMushafPackReader,
    private readonly mushafKey: SvgMushafKey,
    private readonly changed: () => void,
  ) {}

  private idOf(page: number): string {
    return `${this.mushafKey}:${page}`;
  }

  isFailed(page: number): boolean {
    return this.failed.has(page);
  }

  /** Marks a page as failed while a row is rendering: the row shows it at the next repaint. */
  markFailed(page: number): void {
    this.failed.add(page);
  }

  model(page: number): SvgPageModel | null {
    return this.models.get(this.idOf(page)) ?? null;
  }

  /** The page's viewBox origin. A page that cannot be parsed keeps the zero origin; its load records the failure. */
  private originOf(page: number): { x: number; y: number } {
    try {
      return (this.model(page) ?? loadPageModel(this.reader, this.idOf(page), page, this.models)).origin;
    } catch {
      return { x: 0, y: 0 };
    }
  }

  pageData(page: number): PageData {
    const cached = this.data.get(page);
    if (cached !== undefined) {
      return cached;
    }
    // pages 1–2 of the Madinah artwork have a shifted viewBox origin: the regions and boxes follow the page's zero origin.
    const origin = this.originOf(page);
    const built = {
      regions: buildRegionGeometry(this.reader.regionsForPage(page), origin),
      wordBoxes: this.reader.wordBoxesForPage(page).map((box) => ({
        ...box,
        x0: box.x0 - origin.x,
        x1: box.x1 - origin.x,
        y0: box.y0 - origin.y,
        y1: box.y1 - origin.y,
      })),
    };
    this.data.set(page, built);
    if (this.data.size > PAGE_DATA_CAPACITY) {
      this.data.delete(this.data.keys().next().value!);
    }
    return built;
  }

  /** Inflates and parses one page, or records that it failed. */
  load(page: number): void {
    try {
      loadPageModel(this.reader, this.idOf(page), page, this.models);
      this.pageData(page);
      this.failed.delete(page);
    } catch {
      this.failed.add(page);
    }
    this.changed();
  }

  retry(page: number): void {
    this.models.delete(this.idOf(page));
    this.failed.delete(page);
    this.load(page);
  }

  prefetch(pages: readonly number[]): void {
    for (const page of pages) {
      if (this.model(page) === null && !this.failed.has(page) && !this.queue.includes(page)) {
        this.queue.push(page);
      }
    }
    if (!this.scheduled && this.queue.length > 0) {
      this.scheduled = true;
      this.pump();
    }
  }

  /** One page per idle task: a load never shares a task with another page. */
  private pump(): void {
    const next = this.queue.shift();
    if (next === undefined) {
      this.scheduled = false;
      return;
    }
    // requestIdleCallback: React Native 0.88 has removed InteractionManager.
    requestIdleCallback(() => {
      if (this.model(next) === null && !this.failed.has(next)) {
        this.load(next);
      }
      this.pump();
    });
  }

  dispose(): void {
    this.models.clear();
    this.pictures.clear();
    this.data.clear();
    this.failed.clear();
    this.queue.length = 0;
  }
}

export function useMushafPageLoader(reader: SvgMushafPackReader, mushafKey: SvgMushafKey): MushafPageLoader {
  const [version, setVersion] = useState(0);
  const state = useMemo(
    () => new MushafPageState(reader, mushafKey, () => setVersion((current) => current + 1)),
    [mushafKey, reader],
  );

  useEffect(() => () => state.dispose(), [state]);

  // One object per state and version: rows that read it repaint only when a page loads.
  return useMemo<MushafPageLoader>(
    () => ({
      clearPictures: () => state.pictures.clearPictures(),
      error: (page) => state.isFailed(page),
      model: (page) => state.model(page),
      pictureOf: (page, colour) => {
        const model = state.model(page);
        if (model === null) {
          return null;
        }
        try {
          return state.pictures.picture(`${mushafKey}:${page}`, model, colour);
        } catch {
          // A page whose paths cannot be drawn shows its error row, like a page that cannot be read.
          state.markFailed(page);
          return null;
        }
      },
      prefetch: (pages) => state.prefetch(pages),
      regions: (page) => state.pageData(page).regions,
      retry: (page) => state.retry(page),
      version,
      wordBoxes: (page) => state.pageData(page).wordBoxes,
    }),
    [mushafKey, state, version],
  );
}
