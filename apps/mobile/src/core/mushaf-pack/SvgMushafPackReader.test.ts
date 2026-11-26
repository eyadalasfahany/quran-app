import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { openNodeSqlite } from '../../../jest/node-sqlite-executor';
import { buildSvgMushafPackFile } from '../../../jest/svg-mushaf-pack-fixture';

import { SvgMushafPackReader } from './SvgMushafPackReader';

const POLYGON = 'M 0 0 L 1 0 L 1 1 L 0 1 Z';

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'svg-mushaf-reader-'));
});

afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});

function openReader(path: string): { reader: SvgMushafPackReader; close: () => void } {
  const { database, executor } = openNodeSqlite(path);
  return { reader: new SvgMushafPackReader(executor, () => database.close()), close: () => database.close() };
}

function packAt(
  name: string,
  withWordBoxes: boolean,
  meta?: Record<string, string>,
  legacySchema1 = false,
  extra: { origin?: { x: number; y: number }; withoutOrigins?: boolean; withContours?: boolean } = {},
): string {
  const path = join(directory, name);
  buildSvgMushafPackFile(path, { key: 'hafs', legacySchema1, meta, resourceId: 9, version: 2, withWordBoxes, ...extra });
  return path;
}

describe('SvgMushafPackReader', () => {
  it('returns the stored page blob and its origin, and null for a page the pack does not have', () => {
    const { reader, close } = openReader(packAt('boxes.db', false));

    const page = reader.getPage(1);
    expect(page?.blob).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(page!.blob.subarray(0, 4))).toBe('TQP1');
    expect(page?.origin).toEqual({ x: 0, y: 0 });
    expect(reader.getPage(0)).toBeNull();
    expect(reader.getPage(3)).toBeNull();
    close();
  });

  it('returns the viewBox origin each page was stored with (the raw space of its regions and word boxes)', () => {
    const { reader, close } = openReader(packAt('origin.db', false, undefined, false, { origin: { x: -10.5, y: -20.25 } }));

    expect(reader.getPage(1)?.origin).toEqual({ x: -10.5, y: -20.25 });
    close();
  });

  it('returns the regions of a page in order, with null labels for a continuation', () => {
    const { reader, close } = openReader(packAt('regions.db', false));

    expect(reader.regionsForPage(1)).toEqual([
      { surah: 1, ayah: 1, labelX: 10.5, labelY: 20.25, polygon: POLYGON },
      { surah: 1, ayah: 2, labelX: 30.5, labelY: 40.25, polygon: POLYGON },
    ]);
    expect(reader.regionsForPage(2)).toEqual([{ surah: 1, ayah: 2, labelX: null, labelY: null, polygon: POLYGON }]);
    close();
  });

  it('has no word boxes for a pack built without them, and reads them in order when it has them', () => {
    const plain = openReader(packAt('plain.db', false));
    expect(plain.reader.hasWordBoxes).toBe(false);
    expect(plain.reader.wordBoxesForPage(1)).toEqual([]);
    plain.close();

    const boxed = openReader(packAt('boxed.db', true));
    expect(boxed.reader.hasWordBoxes).toBe(true);
    expect(boxed.reader.wordBoxesForPage(1)).toEqual([
      { line: 1, surah: 1, ayah: 1, position: 1, x0: 10.5, y0: 20.25, x1: 30.5, y1: 40.25 },
      { line: 1, surah: 1, ayah: 2, position: 1, x0: 50, y0: 20, x1: 70, y1: 40 },
    ]);
    boxed.close();
  });

  it('reports no word boxes when the meta flag says yes but the table is empty', () => {
    const { reader, close } = openReader(packAt('flag-only.db', false, { has_word_boxes: '1' }));

    expect(reader.hasWordBoxes).toBe(false);
    close();
  });

  it('a pack without the contour tables has no zoom data and reads none', () => {
    const { reader, close } = openReader(packAt('no-contours.db', true));

    expect(reader.hasWordContours).toBe(false);
    expect(reader.wordContoursForPage(1)).toEqual([]);
    expect(reader.contourBlocksForPage(1)).toEqual([]);
    close();
  });

  it('a pack that flags contours but has no tables (a pre-step-13 build) reads none and never throws', () => {
    const { reader, close } = openReader(packAt('flag-only-contours.db', true, { has_word_contours: '1' }));

    expect(reader.hasWordContours).toBe(false);
    expect(reader.wordContoursForPage(1)).toEqual([]);
    close();
  });

  it('a pack with tables but the flag off has no contour data for the reader', () => {
    const { reader, close } = openReader(packAt('pending-contours.db', true, { has_word_contours: '0' }, false, { withContours: true }));

    expect(reader.hasWordContours).toBe(false);
    expect(reader.wordContoursForPage(1)).toEqual([]);
    close();
  });

  it('reads the contour runs of a page in order, with the loose flag, for words whose box is on that page', () => {
    const { reader, close } = openReader(packAt('contours.db', true, undefined, false, { withContours: true }));

    expect(reader.hasWordContours).toBe(true);
    expect(reader.wordContoursForPage(1)).toEqual([
      { ayah: 1, count: 2, first: 0, loose: false, position: 1, surah: 1 },
      { ayah: 1, count: 1, first: 4, loose: false, position: 1, surah: 1 },
      { ayah: 1, count: 1, first: 9, loose: true, position: 1, surah: 1 },
    ]);
    // The run of position 2 has no word box on page 1 (its box is position 1), so the join leaves it out.
    expect(reader.wordContoursForPage(2)).toEqual([]);
    close();
  });

  it('reads blocks with their bounds back in page units (the stored 1/32 integers divided by 32)', () => {
    const { reader, close } = openReader(packAt('blocks.db', true, undefined, false, { withContours: true }));

    expect(reader.contourBlocksForPage(1)).toEqual([
      { ayah: 0, count: 1, first: 7, kind: 1, ord: 0, page: 1, surah: 0, x0: 10, x1: 340, y0: 15, y1: 16 },
    ]);
    close();
  });

  it('maps an ayah to the page it starts on, and null for an ayah not in the pack', () => {
    const { reader, close } = openReader(packAt('map.db', false));

    expect(reader.pageForAyah(1, 1)).toBe(1);
    expect(reader.pageForAyah(9, 9)).toBeNull();
    close();
  });

  it('lists every page of an ayah that spans two pages', () => {
    const { reader, close } = openReader(packAt('span.db', false));

    expect(reader.pagesForAyah(1, 2)).toEqual([1, 2]);
    close();
  });

  it('skips a continuation region when it names the first ayah of a page', () => {
    const { reader, close } = openReader(packAt('first.db', false));

    expect(reader.firstAyahOnPage(1)).toEqual({ surah: 1, ayah: 1 });
    expect(reader.firstAyahOnPage(2)).toEqual({ surah: 1, ayah: 2 });
    expect(reader.firstAyahOnPage(3)).toBeNull();
    close();
  });

  it('refuses a schema-2 pack whose pages table has no origin columns', () => {
    const { reader, close } = openReader(packAt('no-origin.db', false, undefined, false, { withoutOrigins: true }));
    expect(() => reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    close();
  });

  it('refuses a schema-1 pack and a pack with another page format, before any page is read', () => {
    const legacy = openReader(packAt('legacy.db', false, undefined, true));
    expect(() => legacy.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    legacy.close();

    const otherFormat = openReader(packAt('format.db', false, { page_format: 'tqp1-lzma-n16' }));
    expect(() => otherFormat.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    otherFormat.close();
  });

  it('verifies the key, resource, version, schema and page count, and throws on any mismatch', () => {
    const { reader, close } = openReader(packAt('verify.db', false));

    expect(() => reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).not.toThrow();
    expect(() => reader.verify({ key: 'warsh', resourceId: 9, version: 2 })).toThrow('does not match its record');
    expect(() => reader.verify({ key: 'hafs', resourceId: 8, version: 2 })).toThrow('does not match its record');
    expect(() => reader.verify({ key: 'hafs', resourceId: 9, version: 3 })).toThrow('does not match its record');
    close();

    const wrongSchema = openReader(packAt('schema.db', false, { pack_schema_version: '3' }));
    expect(() => wrongSchema.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    wrongSchema.close();

    const wrongCount = openReader(packAt('count.db', false, { page_count: '3' }));
    expect(() => wrongCount.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    wrongCount.close();
  });
});
