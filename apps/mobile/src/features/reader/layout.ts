export const READING_COLUMN_MAX = 720;

/** Mushaf page width cap (spec §4, phase-2 README). */
export const MUSHAF_PAGE_MAX = 640;

export const SIDE_PANEL_WIDTH = 380;
export const PANEL_DOCK_MIN_WIDTH = 1100;

export function readingColumnWidth(windowWidth: number, horizontalGutter = 0): number {
  return Math.min(Math.max(0, windowWidth - horizontalGutter), READING_COLUMN_MAX);
}
