import { gunzipSync } from 'fflate';
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

function packAt(name: string, withWordBoxes: boolean, meta?: Record<string, string>): string {
  const path = join(directory, name);
  buildSvgMushafPackFile(path, { key: 'hafs', resourceId: 9, version: 2, withWordBoxes, meta });
  return path;
}

describe('SvgMushafPackReader', () => {
  it('returns the stored page bytes exactly, and null for a page the pack does not have', () => {
    const { reader, close } = openReader(packAt('boxes.db', false));

    const bytes = reader.getPage(1);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(gunzipSync(bytes as Uint8Array))).toBe('FIXTURE page 1 — not artwork');
    expect(reader.getPage(0)).toBeNull();
    expect(reader.getPage(3)).toBeNull();
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

  it('verifies the key, resource, version, schema and page count, and throws on any mismatch', () => {
    const { reader, close } = openReader(packAt('verify.db', false));

    expect(() => reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).not.toThrow();
    expect(() => reader.verify({ key: 'warsh', resourceId: 9, version: 2 })).toThrow('does not match its record');
    expect(() => reader.verify({ key: 'hafs', resourceId: 8, version: 2 })).toThrow('does not match its record');
    expect(() => reader.verify({ key: 'hafs', resourceId: 9, version: 3 })).toThrow('does not match its record');
    close();

    const wrongSchema = openReader(packAt('schema.db', false, { pack_schema_version: '2' }));
    expect(() => wrongSchema.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    wrongSchema.close();

    const wrongCount = openReader(packAt('count.db', false, { page_count: '3' }));
    expect(() => wrongCount.reader.verify({ key: 'hafs', resourceId: 9, version: 2 })).toThrow('does not match its record');
    wrongCount.close();
  });
});
