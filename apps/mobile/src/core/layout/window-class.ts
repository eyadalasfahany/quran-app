export const WINDOW_COMPACT_MAX = 600;
export const WINDOW_EXPANDED_MIN = 840;
export const WINDOW_HYSTERESIS = 16;
/**
 * A window shorter than this is a landscape phone (ADR 0036): it keeps the compact layout with the bottom tab bar,
 * whatever its width. The sidebar needs a window that is both wide and not short.
 */
export const WINDOW_SHORT_HEIGHT = 480;

export type WindowClass = 'compact' | 'medium' | 'expanded';

const order: Record<WindowClass, number> = { compact: 0, medium: 1, expanded: 2 };

/** The width class alone, ignoring height. Sheets and the menu grid read this (ADR 0036). */
export function widthClassFor(width: number): WindowClass {
  if (width < WINDOW_COMPACT_MAX) {
    return 'compact';
  }
  if (width < WINDOW_EXPANDED_MIN) {
    return 'medium';
  }
  return 'expanded';
}

/** Whether the window is short (a landscape phone). An unknown height (0) is not short. */
export function isShortWindowHeight(height: number): boolean {
  return height > 0 && height < WINDOW_SHORT_HEIGHT;
}

/** The layout class: a short window is compact whatever its width, otherwise the width class decides (ADR 0036). */
export function windowClassFor(width: number, height: number): WindowClass {
  return isShortWindowHeight(height) ? 'compact' : widthClassFor(width);
}

function boundaryBetween(previous: WindowClass, next: WindowClass): number | null {
  const pair = [previous, next].sort((left, right) => order[left] - order[right]).join('-');
  if (pair === 'compact-medium') {
    return WINDOW_COMPACT_MAX;
  }
  if (pair === 'medium-expanded') {
    return WINDOW_EXPANDED_MIN;
  }
  return null;
}

// A resize that only crosses 600 or 840 stays in the current class until it clears ±16.
// A jump across both boundaries takes the class for the new width.
export function nextWindowClass(width: number, previous: WindowClass): WindowClass {
  const next = widthClassFor(width);
  if (next === previous) {
    return next;
  }

  const boundary = boundaryBetween(previous, next);
  if (boundary === null) {
    return next;
  }

  if (order[next] > order[previous]) {
    return width >= boundary + WINDOW_HYSTERESIS ? next : previous;
  }
  return width < boundary - WINDOW_HYSTERESIS ? next : previous;
}
