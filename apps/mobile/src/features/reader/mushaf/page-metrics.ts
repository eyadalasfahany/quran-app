import { MUSHAF_PAGE_MAX } from '@/features/reader/layout';

import { MUSHAF_LINES_PER_PAGE } from './constants';

/** Page width before the double frame (spec §4). */
export function mushafContentWidth(windowWidth: number, horizontalGutter: number): number {
  return Math.min(Math.max(0, windowWidth - horizontalGutter * 2), MUSHAF_PAGE_MAX);
}

/** QCF page fonts scale with width so 15 lines never re-wrap. */
export function mushafFontSize(contentWidth: number): number {
  return contentWidth / 25;
}

export function mushafLineHeight(contentWidth: number): number {
  return contentWidth / MUSHAF_LINES_PER_PAGE;
}

/** Outer frame padding plus 15 line slots (FlashList item height). */
export function mushafPageHeight(contentWidth: number, framePadding: number): number {
  const lineHeight = mushafLineHeight(contentWidth);
  const frame = framePadding * 2 + 4;
  return frame + lineHeight * MUSHAF_LINES_PER_PAGE;
}
