export const QCF_V2_FONT_HOST = 'verses.quran.foundation';
export const QCF_V2_MUSHAF_ID = 1;
export const MUSHAF_PAGE_COUNT = 604;
export const MUSHAF_LINES_PER_PAGE = 15;
export const FONT_REVALIDATE_MS = 30 * 24 * 60 * 60 * 1000;
export const FONT_PREFETCH_RADIUS = 2;
// One page font is a few hundred kilobytes; a stall longer than this counts as a network failure.
export const FONT_FETCH_TIMEOUT_MS = 30_000;
export const FONT_RELEASE_RADIUS = 10;
