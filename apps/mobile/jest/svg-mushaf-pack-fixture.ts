import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'fflate';

// A tiny SVG mushaf pack in the exact A3 schema, written with node:sqlite. Page bytes are placeholder text («FIXTURE page N»),
// polygons are a unit square and coordinates are plain numbers. No Quran artwork or text.

export type SvgMushafPackFixtureOptions = {
  key: string;
  resourceId: number;
  version: number;
  /** Two word boxes when true; the pack is then written with has_word_boxes = 1. */
  withWordBoxes?: boolean;
  /** Overrides any meta value, for the corrupt-pack case. */
  meta?: Record<string, string>;
};

const POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

export function buildSvgMushafPackFile(path: string, options: SvgMushafPackFixtureOptions): void {
  const database = new DatabaseSync(path);
  try {
    database.exec('PRAGMA journal_mode = DELETE');
    database.exec(`
      CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE pages (page INTEGER PRIMARY KEY, svgz BLOB NOT NULL);
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

    const meta: Record<string, string> = {
      pack_schema_version: '1',
      resource_id: String(options.resourceId),
      group: 'svg_mushafs',
      version: String(options.version),
      built_at: '2026-11-15T00:00:00.000Z',
      mushaf_key: options.key,
      edition_year: '1441',
      source_commit: 'fixture-commit',
      page_count: '2',
      has_word_boxes: options.withWordBoxes === true ? '1' : '0',
      ...options.meta,
    };
    const insertMeta = database.prepare('INSERT INTO meta (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(meta)) {
      insertMeta.run(key, value);
    }

    const insertPage = database.prepare('INSERT INTO pages (page, svgz) VALUES (?, ?)');
    for (const page of [1, 2]) {
      insertPage.run(page, gzipSync(new TextEncoder().encode(`FIXTURE page ${page} — not artwork`)));
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
