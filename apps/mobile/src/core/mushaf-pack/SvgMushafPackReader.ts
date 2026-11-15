import type { SqlExecutor } from '@/core/db/sql-executor';

import type { PageRegion, SvgMushafKey, WordBox } from './types';

type RegionRow = { surah: number; ayah: number; label_x: number | null; label_y: number | null; polygon: string };
type WordBoxRow = { line: number; surah: number; ayah: number; position: number; x0: number; y0: number; x1: number; y1: number };

const PACK_SCHEMA_VERSION = '1';

/**
 * Reads one installed SVG mushaf pack. Every method runs SELECT only: the connection is opened with `PRAGMA query_only`.
 * Synchronous, like the executor under it. The pack's own page and ayah mapping is used, never content.db's.
 */
export class SvgMushafPackReader {
  readonly pageCount: number;
  readonly hasWordBoxes: boolean;
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
  }

  /** Throws when the file is not the pack this record names: wrong key, resource, version, schema or page count. */
  verify(expected: { key: SvgMushafKey; resourceId: number; version: number }): void {
    const pagesRow = this.executor.get<{ count: number }>('SELECT COUNT(*) AS count FROM pages');
    const matches =
      this.meta.pack_schema_version === PACK_SCHEMA_VERSION &&
      this.meta.group === 'svg_mushafs' &&
      this.meta.mushaf_key === expected.key &&
      this.meta.resource_id === String(expected.resourceId) &&
      this.meta.version === String(expected.version) &&
      this.pageCount > 0 &&
      pagesRow?.count === this.pageCount;
    if (!matches) {
      throw new Error('The SVG mushaf pack does not match its record.');
    }
  }

  /** The page's stored gzip bytes, as stored (not inflated). Null for a page the pack does not have. */
  getPage(page: number): Uint8Array | null {
    const row = this.executor.get<{ svgz: unknown }>('SELECT svgz FROM pages WHERE page = ?', [page]);
    if (row === undefined) {
      return null;
    }
    if (row.svgz instanceof Uint8Array) {
      return row.svgz;
    }
    return row.svgz instanceof ArrayBuffer ? new Uint8Array(row.svgz) : null;
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
