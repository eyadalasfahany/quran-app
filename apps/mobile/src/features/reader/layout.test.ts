import { mushafContentWidth } from './mushaf/page-metrics';
import {
  MUSHAF_PAGE_MAX,
  mushafSideGutter,
  PANEL_DOCK_MIN_WIDTH,
  panelStripWidth,
  READING_COLUMN_MAX,
  readingColumnWidth,
} from './layout';

describe('docked reader widths', () => {
  const strip = panelStripWidth();
  const sideGutter = mushafSideGutter(strip);

  it('keeps the mushaf page at its 640 cap beside the panel', () => {
    expect(mushafContentWidth(PANEL_DOCK_MIN_WIDTH, sideGutter)).toBe(MUSHAF_PAGE_MAX);
    expect(mushafContentWidth(1366, sideGutter)).toBe(MUSHAF_PAGE_MAX);
  });

  it('fits the reading column beside the panel and caps it at 720', () => {
    expect(readingColumnWidth(PANEL_DOCK_MIN_WIDTH, strip)).toBe(PANEL_DOCK_MIN_WIDTH - strip);
    expect(readingColumnWidth(1366, strip)).toBe(READING_COLUMN_MAX);
  });
});
