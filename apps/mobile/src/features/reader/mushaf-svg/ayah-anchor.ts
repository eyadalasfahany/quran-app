// The exact place on a page (ADR 0073), from the pack's ayah polygons. Pure.
import { scaleFor } from './page-layout';
import type { PageRegionGeometry } from './region-geometry';

/**
 * The top of the ayah's first line on the page that holds its start, in screen units from the artwork's top.
 * Null when the ayah has no region with a label on these regions.
 */
export function offsetForAyah(
  regions: readonly PageRegionGeometry[],
  verseKey: string,
  width: number,
  unitsWidth?: number,
): number | null {
  const region = regions.find((item) => item.verseKey === verseKey && !item.continues);
  const first = region?.lines[0];
  return first === undefined ? null : first.y0 * scaleFor(width, unitsWidth);
}

/**
 * The ayah whose line is the first at or below `yInPage` (page units, from the artwork's top). Lines are ordered
 * top to bottom and, on one band, right to left, so a line shared by two ayahs goes to the one read first.
 */
export function topAyahAt(regions: readonly PageRegionGeometry[], yInPage: number): string | null {
  const lines = regions
    .flatMap((region) => region.lines.map((rect) => ({ rect, verseKey: region.verseKey })))
    .sort((a, b) => a.rect.y0 - b.rect.y0 || b.rect.x1 - a.rect.x1);
  const hit = lines.find(({ rect }) => (rect.y0 + rect.y1) / 2 >= yInPage);
  return hit?.verseKey ?? null;
}
