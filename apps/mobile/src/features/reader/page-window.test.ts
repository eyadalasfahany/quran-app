import { extendPageWindow, MUSHAF_PAGE_COUNT, PAGE_WINDOW_STEP, pageWindowFrom, pagesIn } from './page-window';

describe('mushaf page window', () => {
  it('starts at the opened page, so the list opens at its top', () => {
    expect(pageWindowFrom(50)).toEqual({ from: 50, to: 50 + PAGE_WINDOW_STEP });
    expect(pagesIn(pageWindowFrom(50))[0]).toBe(50);
  });

  it('stays inside the mushaf', () => {
    expect(pageWindowFrom(0)).toEqual({ from: 1, to: 1 + PAGE_WINDOW_STEP });
    expect(pageWindowFrom(MUSHAF_PAGE_COUNT)).toEqual({ from: MUSHAF_PAGE_COUNT, to: MUSHAF_PAGE_COUNT });
  });

  it('grows a step at either end and stops at the first and last pages', () => {
    const window = pageWindowFrom(50);
    expect(extendPageWindow(window, 'start')).toEqual({ from: 50 - PAGE_WINDOW_STEP, to: window.to });
    expect(extendPageWindow(window, 'end')).toEqual({ from: 50, to: window.to + PAGE_WINDOW_STEP });

    const first = { from: 1, to: 7 };
    expect(extendPageWindow(first, 'start')).toBe(first);
    const last = { from: 600, to: MUSHAF_PAGE_COUNT };
    expect(extendPageWindow(last, 'end')).toBe(last);
  });

  it('lists every page it holds, in order', () => {
    expect(pagesIn({ from: 3, to: 6 })).toEqual([3, 4, 5, 6]);
  });
});
