import type { SqlExecutor } from '@/core/db/sql-executor';

import {
  CONTOUR_GRID,
  SVG_MUSHAF_PACK_SCHEMA,
  SVG_MUSHAF_PAGE_FORMAT,
  type ContourBlock,
  type PageRegion,
  type SvgMushafKey,
  type WordBox,
  type WordContourRun,
} from './types';

/** A stored page: its TQP1 blob (artwork at zero origin) and the raw viewBox origin (regions and boxes are in that space). */
export type PackPage = { blob: Uint8Array; origin: { x: number; y: number } };

type RegionRow = { surah: number; ayah: number; label_x: number | null; label_y: number | null; polygon: string };
type WordBoxRow = { line: number; surah: number; ayah: number; position: number; x0: number; y0: number; x1: number; y1: number };
type WordContourRow = { surah: number; ayah: number; position: number; first: number; count: number; flag: number };
type ContourBlockRow = { page: number; kind: number; ord: number; surah: number; ayah: number; first: number; count: number; x0: number; y0: number; x1: number; y1: number };


/**
 * Reads one installed SVG mushaf pack. Every method runs SELECT only: the connection is opened with `PRAGMA query_only`.
 * Synchronous, like the executor under it. The pack's own page and ayah mapping is used, never content.db's.
 */
export class SvgMushafPackReader {
  readonly pageCount: number;
  readonly hasWordBoxes: boolean;
  /** Pack has the word_contours and contour_blocks tables and the approved (or local) flag. Packs before step 13 have neither. */
  readonly hasWordContours: boolean;
  private readonly meta: Record<string, string>;

  constructor(
    private readonly executor: SqlExecutor,
    private readonly closeConnection: () => void,
  ) {
    this.meta = Object.fromEntries(
      executor.all<{ key: string; value: string }>('SELECT key, value FROM meta').map((row) => [row.key, row.value]),
    );
    this.pageCount = Number(this.meta.page_count ?? 0);
    this.hasWordBoxes = this.meta.has_word_boxes === '1' && executor.get('SELECT 1 FROM word_boxes LIMIT 1') !== undefined;
    // Both tables are checked before any SELECT on them: a pack built before them has none (zoom stays off there).
    const tables = new Set(
      executor
        .all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('word_contours', 'contour_blocks')")
        .map((row) => row.name),
    );
    this.hasWordContours = this.meta.has_word_contours === '1' && tables.size === 2;
  }

  /** Throws when the file is not the pack this record names: wrong key, resource, version, schema, page count or page columns. */
  verify(expected: { key: SvgMushafKey; resourceId: number; version: number }): void {
    const pagesRow = this.executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM pages');
    const matches =
      this.meta.pack_schema_version === SVG_MUSHAF_PACK_SCHEMA &&
      this.meta.page_format === SVG_MUSHAF_PAGE_FORMAT &&
      this.meta.group === 'svg_mushafs' &&
      this.meta.mushaf_key === expected.key &&
      this.meta.resource_id === String(expected.resourceId) &&
      this.meta.version === String(expected.version) &&
      this.pageCount > 0 &&
      pagesRow?.count === this.pageCount &&
      this.hasPageOrigins();
    if (!matches) {
      throw new Error('The SVG mushaf pack does not match its record.');
    }
  }

  /** Whether the pages table carries the viewBox origin columns (schema 2 has them; a pack without them is refused). */
  private hasPageOrigins(): boolean {
    try {
      this.executor.get('SELECT origin_x, origin_y FROM pages LIMIT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * The page's stored TQP1 blob and the viewBox origin of the raw page (regions and word boxes are in that space).
   * Null for a page the pack does not have.
   */
  getPage(page: number): PackPage | null {
    const row = this.executor.get<{ tqp: unknown; origin_x: number; origin_y: number }>(
      'SELECT tqp, origin_x, origin_y FROM pages WHERE page = ?',
      [page],
    );
    if (row === undefined) {
      return null;
    }
    const blob = row.tqp instanceof Uint8Array ? row.tqp : row.tqp instanceof ArrayBuffer ? new Uint8Array(row.tqp) : null;
    return blob === null ? null : { blob, origin: { x: Number(row.origin_x), y: Number(row.origin_y) } };
  }

  regionsForPage(page: number): PageRegion[] {
    return this.executor
      .all<RegionRow>('SELECT surah, ayah, label_x, label_y, polygon FROM regions WHERE page = ? ORDER BY surah, ayah', [page])
      .map((row) => ({
        surah: row.surah,
        ayah: row.ayah,
        labelX: row.label_x,
        labelY: row.label_y,
        polygon: row.polygon,
      }));
  }

  wordBoxesForPage(page: number): WordBox[] {
    return this.executor
      .all<WordBoxRow>(
        'SELECT line, surah, ayah, position, x0, y0, x1, y1 FROM word_boxes WHERE page = ? ORDER BY line, surah, ayah, position',
        [page],
      )
      .map((row) => ({ line: row.line, surah: row.surah, ayah: row.ayah, position: row.position, x0: row.x0, y0: row.y0, x1: row.x1, y1: row.y1 }));
  }

  /** The contour runs of the words on a page (empty when the pack has no contour data). */
  wordContoursForPage(page: number): WordContourRun[] {
    if (!this.hasWordContours) {
      return [];
    }
    return this.executor
      .all<WordContourRow>(
        `SELECT c.surah, c.ayah, c.position, c.first, c.count, c.flag FROM word_contours c
         JOIN word_boxes b ON b.surah = c.surah AND b.ayah = c.ayah AND b.position = c.position
         WHERE b.page = ? ORDER BY c.surah, c.ayah, c.position, c.first`,
        [page],
      )
      .map((row) => ({
        ayah: row.ayah,
        count: row.count,
        first: row.first,
        loose: row.flag === 1,
        position: row.position,
        surah: row.surah,
      }));
  }

  /** The blocks, ayah ornaments, sajda lines and hizb ornaments of a page, in table order (empty without contour data). */
  contourBlocksForPage(page: number): ContourBlock[] {
    if (!this.hasWordContours) {
      return [];
    }
    return this.executor
      .all<ContourBlockRow>(
        'SELECT page, kind, ord, surah, ayah, first, count, x0, y0, x1, y1 FROM contour_blocks WHERE page = ? ORDER BY kind, ord',
        [page],
      )
      .map((row) => ({
        ayah: row.ayah,
        count: row.count,
        first: row.first,
        kind: row.kind as ContourBlock['kind'],
        ord: row.ord,
        page: row.page,
        surah: row.surah,
        x0: row.x0 / CONTOUR_GRID,
        x1: row.x1 / CONTOUR_GRID,
        y0: row.y0 / CONTOUR_GRID,
        y1: row.y1 / CONTOUR_GRID,
      }));
  }

  /** The page an ayah starts on, from this pack's regions. Null when the ayah is not in the pack. */
  pageForAyah(surah: number, ayah: number): number | null {
    const row = this.executor.get<{ page: number | null }>('SELECT MIN(page) AS page FROM regions WHERE surah = ? AND ayah = ?', [surah, ayah]);
    return row?.page ?? null;
  }

  pagesForAyah(surah: number, ayah: number): number[] {
    return this.executor
      .all<{ page: number }>('SELECT page FROM regions WHERE surah = ? AND ayah = ? ORDER BY page', [surah, ayah])
      .map((row) => row.page);
  }

  /** The first ayah that starts on the page (a region with labels), else the first region, else null. */
  firstAyahOnPage(page: number): { surah: number; ayah: number } | null {
    const regions = this.executor.all<{ surah: number; ayah: number; label_x: number | null }>(
      'SELECT surah, ayah, label_x FROM regions WHERE page = ? ORDER BY surah, ayah',
      [page],
    );
    const region = regions.find((row) => row.label_x !== null) ?? regions[0];
    return region === undefined ? null : { surah: region.surah, ayah: region.ayah };
  }

  close(): void {
    this.closeConnection();
  }
}
