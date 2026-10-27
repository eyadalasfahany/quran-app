export const MUSHAF_PAGE_COUNT = 604;
/** Pages the mushaf list adds at a time as the reader nears either end of what it holds. */
export const PAGE_WINDOW_STEP = 6;

/** The run of mushaf pages the list holds, inclusive. */
export type PageWindow = { from: number; to: number };

/** A window that starts at the opened page, so the list opens at its top with nothing above to estimate. */
export function pageWindowFrom(page: number): PageWindow {
  const from = Math.min(Math.max(1, page), MUSHAF_PAGE_COUNT);
  return { from, to: Math.min(MUSHAF_PAGE_COUNT, from + PAGE_WINDOW_STEP) };
}

export function extendPageWindow(window: PageWindow, edge: 'start' | 'end'): PageWindow {
  if (edge === 'start') {
    const from = Math.max(1, window.from - PAGE_WINDOW_STEP);
    return from === window.from ? window : { ...window, from };
  }
  const to = Math.min(MUSHAF_PAGE_COUNT, window.to + PAGE_WINDOW_STEP);
  return to === window.to ? window : { ...window, to };
}

export function pagesIn(window: PageWindow): number[] {
  return Array.from({ length: window.to - window.from + 1 }, (_, index) => window.from + index);
}
