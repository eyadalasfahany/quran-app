import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'fflate';

import { emptyPageBlob } from '../src/features/reader/mushaf-svg/__fixtures__/tqp/blob';

// A tiny SVG mushaf pack in the A3 schema (schema 2, TQP1 pages), written with node:sqlite. Pages are empty TQP1 blobs,
// polygons are a unit square and coordinates are plain numbers. No Quran artwork or text.
// `legacySchema1` writes the pre-TQP layout (schema 1, gzip pages in `svgz`), for the refusal tests.

export type SvgMushafPackFixtureOptions = {
  key: string;
  resourceId: number;
  version: number;
  /** Two word boxes when true; the pack is then written with has_word_boxes = 1. */
  withWordBoxes?: boolean;
  /** Writes the old schema-1 layout (gzip pages in `svgz`, no page_format). */
  legacySchema1?: boolean;
  /** The viewBox origin written to every page (default 0, 0). */
  origin?: { x: number; y: number };
  /** Writes a schema-2 pages table without origin_x and origin_y, for the refusal test. */
  withoutOrigins?: boolean;
  /** Overrides any meta value, for the corrupt-pack case. */
  meta?: Record<string, string>;
  /**
   * Writes the word_contours and contour_blocks tables (ADR 0090 step 13, Part A) with one word of three runs, one loose
   * run, and a title block on page 1. Needs `withWordBoxes`. Without it the pack is a pre-step-13 pack (no tables).
   */
  withContours?: boolean;
};

const POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

export function buildSvgMushafPackFile(path: string, options: SvgMushafPackFixtureOptions): void {
  const legacy = options.legacySchema1 === true;
  const database = new DatabaseSync(path);
  try {
    database.exec('PRAGMA journal_mode = DELETE');
    database.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE pages (page INTEGER PRIMARY KEY, ${legacy ? 'svgz' : 'tqp'} BLOB NOT NULL${
        legacy || options.withoutOrigins === true ? '' : ', origin_x REAL NOT NULL, origin_y REAL NOT NULL'
      });
      CREATE TABLE regions (
        page INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
        label_x REAL, label_y REAL, polygon TEXT NOT NULL,
        PRIMARY KEY (page, surah, ayah)
      ) WITHOUT ROWID;
      CREATE INDEX regions_ayah ON regions (surah, ayah, page);
      CREATE TABLE word_boxes (
        page INTEGER NOT NULL, line INTEGER NOT NULL, surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
        position INTEGER NOT NULL, x0 REAL NOT NULL, y0 REAL NOT NULL, x1 REAL NOT NULL, y1 REAL NOT NULL,
        PRIMARY KEY (surah, ayah, position)
      ) WITHOUT ROWID;
      CREATE INDEX word_boxes_page ON word_boxes (page, line);
    `);
    if (options.withContours === true) {
      database.exec(`
        CREATE TABLE word_contours (
          surah INTEGER NOT NULL, ayah INTEGER NOT NULL, position INTEGER NOT NULL,
          first INTEGER NOT NULL, count INTEGER NOT NULL, flag INTEGER NOT NULL,
          PRIMARY KEY (surah, ayah, position, first)
        ) WITHOUT ROWID;
        CREATE TABLE contour_blocks (
          page INTEGER NOT NULL, kind INTEGER NOT NULL, ord INTEGER NOT NULL,
          surah INTEGER NOT NULL, ayah INTEGER NOT NULL,
          first INTEGER NOT NULL, count INTEGER NOT NULL,
          x0 INTEGER NOT NULL, y0 INTEGER NOT NULL, x1 INTEGER NOT NULL, y1 INTEGER NOT NULL,
          PRIMARY KEY (page, kind, ord)
        ) WITHOUT ROWID;
      `);
      const insertContour = database.prepare('INSERT INTO word_contours (surah, ayah, position, first, count, flag) VALUES (?, ?, ?, ?, ?, ?)');
      insertContour.run(1, 1, 1, 0, 2, 0);
      insertContour.run(1, 1, 1, 4, 1, 0);
      insertContour.run(1, 1, 1, 9, 1, 1);
      insertContour.run(1, 1, 2, 2, 2, 0);
      const insertBlock = database.prepare('INSERT INTO contour_blocks (page, kind, ord, surah, ayah, first, count, x0, y0, x1, y1) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertBlock.run(1, 1, 0, 0, 0, 7, 1, 320, 480, 10880, 512);
    }

    const meta: Record<string, string> = legacy
      ? { pack_schema_version: '1' }
      : { pack_schema_version: '2', page_format: 'tqp1-deflate-n32' };
    Object.assign(meta, {
      resource_id: String(options.resourceId),
      group: 'svg_mushafs',
      version: String(options.version),
      built_at: '2026-11-15T00:00:00.000Z',
      mushaf_key: options.key,
      edition_year: '1441',
      source_commit: 'fixture-commit',
      page_count: '2',
      has_word_boxes: options.withWordBoxes === true ? '1' : '0',
      has_word_contours: options.withContours === true ? '1' : '0',
      ...options.meta,
    });
    const insertMeta = database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(meta)) {
      insertMeta.run(key, value);
    }

    const origin = options.origin ?? { x: 0, y: 0 };
    if (legacy || options.withoutOrigins === true) {
      const insertPage = database.prepare(`INSERT INTO pages (page, ${legacy ? 'svgz' : 'tqp'}) VALUES (?, ?)`);
      for (const page of [1, 2]) {
        insertPage.run(page, legacy ? gzipSync(new TextEncoder().encode(`FIXTURE page ${page} — not artwork`)) : emptyPageBlob());
      }
    } else {
      const insertPage = database.prepare('INSERT INTO pages (page, tqp, origin_x, origin_y) VALUES (?, ?, ?, ?)');
      for (const page of [1, 2]) {
        insertPage.run(page, emptyPageBlob(), origin.x, origin.y);
      }
    }

    const insertRegion = database.prepare('INSERT INTO regions (page, surah, ayah, label_x, label_y, polygon) VALUES (?, ?, ?, ?, ?, ?)');
    insertRegion.run(1, 1, 1, 10.5, 20.25, POLYGON);
    insertRegion.run(1, 1, 2, 30.5, 40.25, POLYGON);
    insertRegion.run(2, 1, 2, null, null, POLYGON);

    if (options.withWordBoxes === true) {
      const insertBox = database.prepare('INSERT INTO word_boxes (page, line, surah, ayah, position, x0, y0, x1, y1) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      insertBox.run(1, 1, 1, 1, 1, 10.5, 20.25, 30.5, 40.25);
      insertBox.run(1, 1, 1, 2, 1, 50, 20, 70, 40);
    }
  } finally {
    database.close();
  }
}
