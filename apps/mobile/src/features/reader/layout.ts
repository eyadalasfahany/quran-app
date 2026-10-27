import { size } from '@quran/design-tokens';

export const READING_COLUMN_MAX = 720;

/** Mushaf page width cap (spec §4, phase-2 README). */
export const MUSHAF_PAGE_MAX = 640;

export const SIDE_PANEL_WIDTH = size.sidePanel;
export const PANEL_DOCK_MIN_WIDTH = 1100;
export const PANEL_INSET = 16;

export type PanelPlacement = 'sheet' | 'overlay' | 'docked';

// Tertiary column hides first (layout.md › Adaptability): the panel docks only when both fit.
export function panelPlacementFor(
  width: number,
  windowClass: 'compact' | 'medium' | 'expanded',
): PanelPlacement {
  if (windowClass !== 'expanded') {
    return 'sheet';
  }
  return width >= PANEL_DOCK_MIN_WIDTH ? 'docked' : 'overlay';
}

export function panelStripWidth(): number {
  return SIDE_PANEL_WIDTH + PANEL_INSET;
}

/** `mushafContentWidth` subtracts the gutter on both sides. A docked panel occupies one side. */
export function mushafSideGutter(panelStrip: number): number {
  return panelStrip / 2;
}

export function readingColumnWidth(windowWidth: number, horizontalGutter = 0): number {
  return Math.min(Math.max(0, windowWidth - horizontalGutter), READING_COLUMN_MAX);
}
