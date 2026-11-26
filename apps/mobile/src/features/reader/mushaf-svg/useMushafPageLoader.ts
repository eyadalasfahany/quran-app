// Loads the Madinah pages a list shows: each page's model, regions and word boxes, and its pictures (ADR 0090 decision
// 8). Loads run one page per idle task, nearest first, so a page is never inflated inside a scroll frame.
import type { SkPicture } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';

import type { SvgMushafKey, SvgMushafPackReader, WordBox } from '@/core/mushaf-pack';

import { buildLayoutInput } from './layout-input';
import { buildRegionGeometry, type PageRegionGeometry } from './region-geometry';
import {
  buildRunsPath,
  PagePictureCache,
  PageUnitPathCache,
  recordZoomPicture,
  type PlacedPath,
  ZoomPictureCache,
} from './page-picture';
import { loadPageModel, PAGE_MODEL_CACHE, PageModelCache } from './page-source';
import { layoutPage, runsOf, type LayoutInput, type PageLayout, type Placed } from './rewrap-layout';
import type { SvgPageModel } from './svg-page-model';
import { decodeTqp, type TqpDecoded } from './tqp-decoder';
import { splitSubpaths, type SubpathTable } from './tqp-subpaths';

/** Regions and boxes are small; this many pages' worth stays in memory. */
const PAGE_DATA_CAPACITY = 16;
/** Decoded pages kept for the zoom (their word paths are cached separately, for four pages). */
const DECODED_CAPACITY = 4;
/** Laid-out pages kept for the current zoom. */
const LAYOUT_CAPACITY = 16;

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
  /** The page laid out at a zoom above 1 (rewrap-layout.ts), or null: the page then draws at 100%. */
  layout: (page: number, zoom: number) => PageLayout | null;
  /** The zoomed picture of a page in one colour, or null when the page has no layout at this zoom. */
  zoomedPicture: (page: number, zoom: number, colour: string) => SkPicture | null;
  /** Queues the layouts of the pages for idle tasks, in the order given (nearest first). */
  prefetchLayouts: (pages: readonly number[], zoom: number) => void;
};

type PageData = { regions: PageRegionGeometry[]; wordBoxes: WordBox[]; layoutInput: LayoutInput | null };

/** The caches of one pack and one riwayah. A new reader or riwayah gets a new one, so nothing is shared. */
class MushafPageState {
  readonly models = new PageModelCache(PAGE_MODEL_CACHE);
  readonly pictures = new PagePictureCache(PAGE_MODEL_CACHE);
  private readonly data = new Map<number, PageData>();
  private readonly failed = new Set<number>();
  private readonly queue: number[] = [];
  private scheduled = false;
  private readonly decoded = new Map<number, { decoded: TqpDecoded; table: SubpathTable }>();
  private readonly unitPaths = new PageUnitPathCache(4);
  private readonly zoomPictures = new ZoomPictureCache();
  private readonly layouts = new Map<number, PageLayout>();
  private layoutZoom = 1;

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
    // Regions and boxes are in the raw viewBox space; the pictures are baked to zero. The origin comes from the pack page.
    const origin = this.originOf(page);
    const rawRegions = this.reader.regionsForPage(page);
    const built: PageData = {
      layoutInput: this.reader.hasWordContours
        ? buildLayoutInput({
            blocks: this.reader.contourBlocksForPage(page),
            boxes: this.reader.wordBoxesForPage(page),
            continuing: new Set(rawRegions.filter((region) => region.labelX === null).map((region) => `${region.surah}:${region.ayah}`)),
            origin,
            runs: this.reader.wordContoursForPage(page),
          })
        : null,
      regions: buildRegionGeometry(rawRegions, origin),
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

  /** The page decoded for the zoom (its commands and subpath table), kept for the last few pages. Null when it cannot be read. */
  private decodedOf(page: number): { decoded: TqpDecoded; table: SubpathTable } | null {
    const cached = this.decoded.get(page);
    if (cached !== undefined) {
      return cached;
    }
    try {
      // The 100% model already holds the decode when the page is loaded: no second inflate.
      const stored = this.model(page)?.decoded === undefined ? this.reader.getPage(page) : null;
      const decoded = this.model(page)?.decoded ?? (stored === null ? null : decodeTqp(stored.blob));
      if (decoded === null) {
        return null;
      }
      const entry = { decoded, table: splitSubpaths(decoded) };
      this.decoded.set(page, entry);
      if (this.decoded.size > DECODED_CAPACITY) {
        this.decoded.delete(this.decoded.keys().next().value!);
      }
      return entry;
    } catch {
      return null;
    }
  }

  /**
   * The page laid out at `zoom` (B2). Zoom 1 is never laid out: the printed page is drawn. A zoom change drops the layouts
   * and the pictures of the other zooms. Null when the page has no word contours.
   */
  layout(page: number, zoom: number): PageLayout | null {
    if (zoom <= 1) {
      return null;
    }
    const input = this.pageData(page).layoutInput;
    if (input === null || (input.words.length === 0 && input.blocks.length === 0)) {
      return null;
    }
    if (zoom !== this.layoutZoom) {
      this.layouts.clear();
      this.layoutZoom = zoom;
      this.zoomPictures.clearZoom(zoom);
    }
    const hit = this.layouts.get(page);
    if (hit !== undefined) {
      return hit;
    }
    const built = layoutPage(input, zoom);
    this.layouts.set(page, built);
    if (this.layouts.size > LAYOUT_CAPACITY) {
      this.layouts.delete(this.layouts.keys().next().value!);
    }
    return built;
  }

  zoomedPicture(page: number, zoom: number, colour: string): SkPicture | null {
    const layout = this.layout(page, zoom);
    const decoded = layout === null ? null : this.decodedOf(page);
    if (layout === null || decoded === null) {
      return null;
    }
    return this.zoomPictures.picture(this.idOf(page), zoom, colour, () => {
      const paths = this.unitPaths.pagePaths(this.idOf(page));
      const items: PlacedPath[] = layout.placed.map((placed) => ({
        matrix: matrixOf(placed),
        path: this.pathOf(paths, placed, decoded),
      }));
      return recordZoomPicture(items, layout.unitsWidth, layout.unitsHeight, colour);
    });
  }

  /** The word path of a placed unit (its runs in page units), cached per page. */
  private pathOf(paths: Map<string, ReturnType<typeof buildRunsPath>>, placed: Placed, decoded: { decoded: TqpDecoded; table: SubpathTable }) {
    const unit = placed.unit;
    const key =
      'box' in unit
        ? `w${unit.surah}:${unit.ayah}:${unit.position}`
        : 'surah' in unit
          ? `h${unit.first}:${unit.count}`
          : `b${unit.first}:${unit.count}`;
    const hit = paths.get(key);
    if (hit !== undefined) {
      return hit;
    }
    const built = buildRunsPath(decoded.decoded, decoded.table, runsOf(unit));
    paths.set(key, built);
    return built;
  }

  prefetchLayouts(pages: readonly number[], zoom: number): void {
    for (const page of pages) {
      requestIdleCallback(() => {
        this.layout(page, zoom);
      });
    }
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
    // The newest request wins: pages a fling has already passed are not decoded.
    this.queue.length = 0;
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

  clearZoomPictures(): void {
    this.zoomPictures.clear();
  }

  dispose(): void {
    this.models.clear();
    this.pictures.clear();
    this.data.clear();
    this.failed.clear();
    this.queue.length = 0;
    this.decoded.clear();
    this.layouts.clear();
    this.zoomPictures.clear();
    this.unitPaths.clear();
  }
}

/** The SVG matrix that places a unit's picture: scale about its extent's centre, then the translation (B4). */
function matrixOf(placed: Placed): [number, number, number, number, number, number] {
  const { scale, cx, cy, dx, dy } = placed;
  return [scale, 0, 0, scale, dx + (1 - scale) * cx, dy + (1 - scale) * cy];
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
      clearPictures: () => {
        state.pictures.clearPictures();
        state.clearZoomPictures();
      },
      layout: (page, zoom) => state.layout(page, zoom),
      prefetchLayouts: (pages, zoom) => state.prefetchLayouts(pages, zoom),
      zoomedPicture: (page, zoom, colour) => state.zoomedPicture(page, zoom, colour),
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
