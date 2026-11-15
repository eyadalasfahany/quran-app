// Page sizes for the Skia page (ADR 0090 decision 8, spec §4). Pure. The artwork is drawn in 345 × 550 units and
// scaled to the width the list gives it.
import { MUSHAF_PAGE_MAX } from '@/features/reader/layout';

import type { Rect } from './region-geometry';

export const PAGE_VIEWBOX = { height: 550, width: 345 } as const;

/** One side of the page's frame. The SVG pages have no decorative frame (developer, 15 Nov 2026), so the artwork gets the width. */
export const MUSHAF_FRAME_SIDE = 0;

/** The page width available for the artwork, given the gutters around the page. Never below 0, never above the cap. */
export function pageWidthFor(windowWidth: number, gutters: number): number {
  return Math.max(0, Math.min(windowWidth - gutters, MUSHAF_PAGE_MAX));
}

export function pageHeightFor(width: number): number {
  return (width * PAGE_VIEWBOX.height) / PAGE_VIEWBOX.width;
}

export function scaleFor(width: number): number {
  return width / PAGE_VIEWBOX.width;
}

/** The FlashList item height: the framed page plus the divider that leads it. */
export function pageItemHeight(width: number, dividerHeight: number): number {
  return pageHeightFor(width) + 2 * MUSHAF_FRAME_SIDE + dividerHeight;
}

/** Screen point → page units. */
export function toPage(point: { x: number; y: number }, width: number): { x: number; y: number } {
  const scale = scaleFor(width);
  return { x: point.x / scale, y: point.y / scale };
}

/** Page units → screen units. */
export function toScreen(rect: Rect, width: number): Rect {
  const scale = scaleFor(width);
  return { x0: rect.x0 * scale, x1: rect.x1 * scale, y0: rect.y0 * scale, y1: rect.y1 * scale };
}
