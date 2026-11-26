// Page sizes for the Skia page (ADR 0090 decision 8, spec §4). Pure. The artwork is drawn in 345 × 550 units and
// scaled to the width the list gives it.
import type { Rect } from './region-geometry';

export const PAGE_VIEWBOX = { height: 550, width: 345 } as const;

/** One side of the page's frame. The SVG pages have no decorative frame (developer, 15 Nov 2026), so the artwork gets the width. */
export const MUSHAF_FRAME_SIDE = 0;

/**
 * The page width for the artwork: the reader's column width minus the gutters (the safe-area insets, the side
 * gutters, the frame sides). No cap: the printed page takes the full column (ADR 0090 amendment, item 7). Never below 0.
 */
export function pageWidthFor(columnWidth: number, gutters: number): number {
  return Math.max(0, columnWidth - gutters);
}

// The optional geometry is a zoomed page's picture (rewrap-layout.ts): its size in layout units. The defaults are the
// printed page, so every call without them is the 100% page exactly as before.
export function pageHeightFor(
  width: number,
  unitsWidth: number = PAGE_VIEWBOX.width,
  unitsHeight: number = PAGE_VIEWBOX.height,
): number {
  return (width * unitsHeight) / unitsWidth;
}

export function scaleFor(width: number, unitsWidth: number = PAGE_VIEWBOX.width): number {
  return width / unitsWidth;
}

/** The FlashList item height: the framed page plus the divider that leads it. */
export function pageItemHeight(
  width: number,
  dividerHeight: number,
  unitsWidth: number = PAGE_VIEWBOX.width,
  unitsHeight: number = PAGE_VIEWBOX.height,
): number {
  return pageHeightFor(width, unitsWidth, unitsHeight) + 2 * MUSHAF_FRAME_SIDE + dividerHeight;
}

/** Screen point → page units. */
export function toPage(point: { x: number; y: number }, width: number, unitsWidth: number = PAGE_VIEWBOX.width): { x: number; y: number } {
  const scale = scaleFor(width, unitsWidth);
  return { x: point.x / scale, y: point.y / scale };
}

/** Page units → screen units. */
export function toScreen(rect: Rect, width: number, unitsWidth: number = PAGE_VIEWBOX.width): Rect {
  const scale = scaleFor(width, unitsWidth);
  return { x0: rect.x0 * scale, x1: rect.x1 * scale, y0: rect.y0 * scale, y1: rect.y1 * scale };
}
