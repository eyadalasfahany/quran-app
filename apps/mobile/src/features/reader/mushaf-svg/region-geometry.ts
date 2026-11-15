// Ayah polygons as points, for hit tests and the follow (ADR 0090 decision 10). Pure: no Skia. Coordinates are in the
// page's 345 × 550 units, the same space as the word boxes.
import type { PageRegion } from '@/core/mushaf-pack';

export type Point = readonly [x: number, y: number];
export type Rect = { x0: number; y0: number; x1: number; y1: number };

const TOKEN = /[MLHVZ]|[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/g;

/**
 * Subpaths of an absolute M, L, H, V, Z polygon. Null for a lower-case command, a curve, or any other character.
 * shortcut: curves and relative commands are rejected, not drawn; the pack only carries the polygon form.
 */
export function parsePolygon(polygon: string): Point[][] | null {
  const tokens = polygon.match(TOKEN);
  if (tokens === null || tokens.join('') !== polygon.replace(/[\s,]/g, '')) {
    return null;
  }
  // pages 1–2 of the Madinah artwork store a plain point list ("x,y x,y …") instead of path commands.
  if (!/[A-Za-z]/.test(polygon)) {
    const values = tokens.map(Number);
    if (values.length < 6 || values.length % 2 !== 0 || !values.every(Number.isFinite)) {
      return null;
    }
    const points: Point[] = [];
    for (let i = 0; i < values.length; i += 2) {
      points.push([values[i]!, values[i + 1]!]);
    }
    return [points];
  }
  const subpaths: Point[][] = [];
  let current: Point[] | null = null;
  let command = '';
  let last: Point = [0, 0];
  let index = 0;

  const numbers = (count: number): number[] | null => {
    const values: number[] = [];
    for (let read = 0; read < count; read += 1) {
      const token = tokens[index];
      if (token === undefined || /^[A-Z]$/.test(token)) {
        return null;
      }
      values.push(Number(token));
      index += 1;
    }
    return values;
  };

  while (index < tokens.length) {
    const token = tokens[index]!;
    if (/^[A-Z]$/.test(token)) {
      command = token;
      index += 1;
      if (command === 'Z') {
        if (current === null) {
          return null;
        }
        subpaths.push(current);
        current = null;
      }
      continue;
    }
    if (command === 'M') {
      const pair = numbers(2);
      if (pair === null) {
        return null;
      }
      if (current !== null) {
        subpaths.push(current);
      }
      last = [pair[0]!, pair[1]!];
      current = [last];
      command = 'L';
      continue;
    }
    if (current === null || (command !== 'L' && command !== 'H' && command !== 'V')) {
      return null;
    }
    const values = numbers(command === 'L' ? 2 : 1);
    if (values === null) {
      return null;
    }
    last = command === 'L' ? [values[0]!, values[1]!] : command === 'H' ? [values[0]!, last[1]] : [last[0], values[0]!];
    current.push(last);
  }
  if (current !== null) {
    subpaths.push(current);
  }
  return subpaths.length === 0 ? null : subpaths;
}

export function boundsOf(subpaths: readonly (readonly Point[])[]): Rect | null {
  let bounds: Rect | null = null;
  for (const subpath of subpaths) {
    for (const [x, y] of subpath) {
      bounds =
        bounds === null
          ? { x0: x, x1: x, y0: y, y1: y }
          : { x0: Math.min(bounds.x0, x), x1: Math.max(bounds.x1, x), y0: Math.min(bounds.y0, y), y1: Math.max(bounds.y1, y) };
    }
  }
  return bounds;
}

/** Even-odd across subpaths. A point on the left or top edge is inside; on the right or bottom edge, outside. */
export function pointInPolygon(subpaths: readonly (readonly Point[])[], x: number, y: number): boolean {
  let inside = false;
  for (const subpath of subpaths) {
    for (let i = 0, j = subpath.length - 1; i < subpath.length; j = i, i += 1) {
      const [xi, yi] = subpath[i]!;
      const [xj, yj] = subpath[j]!;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
  }
  return inside;
}

/** One rect per subpath (a line, or a block of lines), top to bottom; right to left on a tie. */
export function linesOf(subpaths: readonly (readonly Point[])[]): Rect[] {
  const rects = subpaths.flatMap((subpath) => {
    const bounds = boundsOf([subpath]);
    return bounds === null ? [] : [bounds];
  });
  return rects.sort((a, b) => a.y0 - b.y0 || b.x1 - a.x1);
}

export type PageRegionGeometry = {
  surah: number;
  ayah: number;
  verseKey: string;
  /** The ayah started on the previous page; its label is not on this page. */
  continues: boolean;
  /** The polygon as the pack stores it: the Skia wash is built from it. */
  polygon: string;
  subpaths: Point[][];
  bounds: Rect;
  lines: Rect[];
};

/**
 * Drops, with a dev warning, any region whose polygon cannot be read.
 * `origin` is the page's viewBox min-x, min-y: pages 1–2 of the Madinah artwork have a shifted viewBox origin.
 */
export function buildRegionGeometry(
  regions: readonly PageRegion[],
  origin: { x: number; y: number } = { x: 0, y: 0 },
): PageRegionGeometry[] {
  const out: PageRegionGeometry[] = [];
  for (const region of regions) {
    const parsed = parsePolygon(region.polygon);
    const subpaths = parsed === null ? null : parsed.map((subpath) => subpath.map(([x, y]): Point => [x - origin.x, y - origin.y]));
    const bounds = subpaths === null ? null : boundsOf(subpaths);
    if (subpaths === null || bounds === null) {
      if (__DEV__) {
        console.warn(`[mushaf] region ${region.surah}:${region.ayah} has an unsupported polygon; dropped.`);
      }
      continue;
    }
    out.push({
      ayah: region.ayah,
      bounds,
      continues: region.labelX === null,
      lines: linesOf(subpaths),
      polygon: region.polygon,
      subpaths,
      surah: region.surah,
      verseKey: `${region.surah}:${region.ayah}`,
    });
  }
  return out;
}

const area = (rect: Rect) => (rect.x1 - rect.x0) * (rect.y1 - rect.y0);

/** The region whose polygon holds the point. Where two do (a shared edge), the smaller bounds win. */
export function regionAt(regions: readonly PageRegionGeometry[], x: number, y: number): PageRegionGeometry | null {
  let best: PageRegionGeometry | null = null;
  for (const region of regions) {
    const b = region.bounds;
    if (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1 || !pointInPolygon(region.subpaths, x, y)) {
      continue;
    }
    if (best === null || area(b) < area(best.bounds)) {
      best = region;
    }
  }
  return best;
}
