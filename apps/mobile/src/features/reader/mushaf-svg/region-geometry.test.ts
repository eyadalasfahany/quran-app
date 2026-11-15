import type { PageRegion } from '@/core/mushaf-pack';

import {
  boundsOf,
  buildRegionGeometry,
  linesOf,
  parsePolygon,
  pointInPolygon,
  regionAt,
  type Point,
} from './region-geometry';

const RECT = 'M 0 0 L 4 0 L 4 2 L 0 2 Z';

describe('parsePolygon', () => {
  it('reads a rectangle into one closed subpath', () => {
    expect(parsePolygon(RECT)).toEqual([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [0, 2],
      ],
    ]);
  });

  it('reads an L-shaped polygon and the H and V forms', () => {
    const shape = parsePolygon('M 0 0 H 4 V 2 H 2 V 3 H 0 Z');
    expect(shape).toEqual([
      [
        [0, 0],
        [4, 0],
        [4, 2],
        [2, 2],
        [2, 3],
        [0, 3],
      ],
    ]);
  });

  it('reads comma separators and decimal numbers, and an implicit line after M', () => {
    expect(parsePolygon('M296.0,74.75 342.5 74.75 L 342.5,80 Z')).toEqual([
      [
        [296, 74.75],
        [342.5, 74.75],
        [342.5, 80],
      ],
    ]);
  });

  it('reads a plain point list as one closed subpath', () => {
    expect(parsePolygon('181.08,18.31 57.54,18.31 57.54,48.94 181.08,48.94')).toEqual([
      [
        [181.08, 18.31],
        [57.54, 18.31],
        [57.54, 48.94],
        [181.08, 48.94],
      ],
    ]);
  });

  it('rejects a point list with an odd count of numbers, or fewer than three points', () => {
    expect(parsePolygon('1 2 3 4 5')).toBeNull();
    expect(parsePolygon('1 2 3 4')).toBeNull();
    expect(parsePolygon('1,2')).toBeNull();
  });

  it('reads two subpaths', () => {
    expect(parsePolygon('M 0 0 L 1 0 L 1 1 Z M 5 5 L 6 5 L 6 6 Z')?.length).toBe(2);
  });

  it('returns null for lower-case commands, curves and anything else', () => {
    expect(parsePolygon('m 0 0 l 1 0 z')).toBeNull();
    expect(parsePolygon('M 0 0 C 1 1 2 2 3 3 Z')).toBeNull();
    expect(parsePolygon('M 0 0 L 1 0 ? Z')).toBeNull();
    expect(parsePolygon('M 0 0 L 1 Z')).toBeNull();
    expect(parsePolygon('L 1 0 Z')).toBeNull();
    expect(parsePolygon('')).toBeNull();
  });
});

describe('pointInPolygon', () => {
  const square = parsePolygon(RECT)!;

  it('finds interior points and rejects exterior points', () => {
    expect(pointInPolygon(square, 2, 1)).toBe(true);
    expect(pointInPolygon(square, 5, 1)).toBe(false);
    expect(pointInPolygon(square, -1, 1)).toBe(false);
  });

  it('counts a point on the left or top edge inside, and on the right or bottom edge outside', () => {
    expect(pointInPolygon(square, 0, 1)).toBe(true);
    expect(pointInPolygon(square, 2, 0)).toBe(true);
    expect(pointInPolygon(square, 4, 1)).toBe(false);
    expect(pointInPolygon(square, 2, 2)).toBe(false);
  });

  it('is even-odd across two subpaths: a point in both is outside', () => {
    const nested = [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
      [
        [2, 2],
        [8, 2],
        [8, 8],
        [2, 8],
      ],
    ] as Point[][];
    expect(pointInPolygon(nested, 5, 5)).toBe(false);
    expect(pointInPolygon(nested, 1, 1)).toBe(true);
  });
});

describe('boundsOf and linesOf', () => {
  it('returns the bounds, and null for nothing', () => {
    expect(boundsOf(parsePolygon(RECT)!)).toEqual({ x0: 0, x1: 4, y0: 0, y1: 2 });
    expect(boundsOf([])).toBeNull();
  });

  it('returns one rect per subpath, top to bottom, right to left on a tie', () => {
    const lines = linesOf(parsePolygon('M 0 10 L 2 10 L 2 12 L 0 12 Z M 5 0 L 7 0 L 7 2 L 5 2 Z M 0 0 L 3 0 L 3 2 L 0 2 Z')!);
    expect(lines.map((rect) => [rect.x0, rect.y0])).toEqual([
      [5, 0],
      [0, 0],
      [0, 10],
    ]);
  });
});

describe('buildRegionGeometry and regionAt', () => {
  const regions = (polygons: readonly string[]): PageRegion[] =>
    polygons.map((polygon, index) => ({ ayah: index + 1, labelX: index === 0 ? 1 : null, labelY: 1, polygon, surah: 1 }));

  it('drops a region whose polygon cannot be read, without throwing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const built = buildRegionGeometry(regions([RECT, 'M 0 0 C 1 1 2 2 3 3 Z']));
    expect(built.map((region) => region.verseKey)).toEqual(['1:1']);
    expect(built[0]!.continues).toBe(false);
    warn.mockRestore();
  });

  it('marks a region without a label as continuing', () => {
    const built = buildRegionGeometry(regions([RECT, RECT]));
    expect(built[1]!.continues).toBe(true);
  });

  it('subtracts a shifted page origin from the polygon points, and keeps a null label continuing', () => {
    const origin = { x: -10, y: -20 };
    const [shifted] = buildRegionGeometry(regions([RECT, RECT]), origin);
    expect(shifted!.subpaths).toEqual([
      [
        [10, 20],
        [14, 20],
        [14, 22],
        [10, 22],
      ],
    ]);
    expect(shifted!.bounds).toEqual({ x0: 10, y0: 20, x1: 14, y1: 22 });
    expect(shifted!.continues).toBe(false);
    expect(buildRegionGeometry(regions([RECT, RECT]), origin)[1]!.continues).toBe(true);
  });

  it('returns the smaller region where two contain the point', () => {
    const big = buildRegionGeometry([{ ayah: 1, labelX: 1, labelY: 1, polygon: 'M 0 0 L 10 0 L 10 10 L 0 10 Z', surah: 1 }]);
    const small = buildRegionGeometry([{ ayah: 2, labelX: 1, labelY: 1, polygon: 'M 0 0 L 4 0 L 4 4 L 0 4 Z', surah: 1 }]);
    const hit = regionAt([...big, ...small], 2, 2);
    expect(hit?.verseKey).toBe('1:2');
    expect(regionAt([...big, ...small], 8, 8)?.verseKey).toBe('1:1');
    expect(regionAt([...big, ...small], 20, 20)).toBeNull();
  });
});
