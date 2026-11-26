/** The pack schema and page format this build reads (ADR 0090, step 12). A pack of any other format is refused. */
export const SVG_MUSHAF_PACK_SCHEMA = '2';
export const SVG_MUSHAF_PAGE_FORMAT = 'tqp1-deflate-n32';

export const SVG_MUSHAF_KEYS = ['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as const;

export type SvgMushafKey = (typeof SVG_MUSHAF_KEYS)[number];

export function isSvgMushafKey(value: string): value is SvgMushafKey {
  return (SVG_MUSHAF_KEYS as readonly string[]).includes(value);
}

/** One ayah's polygon on a page. Labels are null for a region that continues from the previous page. */
export type PageRegion = {
  surah: number;
  ayah: number;
  labelX: number | null;
  labelY: number | null;
  polygon: string;
};

export type WordBox = {
  line: number;
  surah: number;
  ayah: number;
  position: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** contour_blocks and word_contours bounds are integers in 1/32 of a page unit (ADR 0090 amendment, 26 Nov 2026). */
export const CONTOUR_GRID = 32;

/** One run of a word's TQP subpaths: `flag` 1 is a loose contour attached to this word (outside its box). */
export type WordContourRun = {
  surah: number;
  ayah: number;
  position: number;
  first: number;
  count: number;
  loose: boolean;
};

/**
 * A block (kind 1), ayah ornament (2), sajda line (3) or hizb ornament (4) of one page, in raw viewBox space with its
 * bounds in page units (the stored 1/32 integers divided by CONTOUR_GRID). `surah` and `ayah` are 0 for a block.
 */
export type ContourBlock = {
  page: number;
  kind: 1 | 2 | 3 | 4;
  ord: number;
  surah: number;
  ayah: number;
  first: number;
  count: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

/** The record of the installed version of one riwayah, kept in MMKV. */
export type InstalledSvgMushaf = {
  key: SvgMushafKey;
  resourceId: number;
  version: number;
  sha256: string;
  sizeBytes: number;
  hasWordBoxes: boolean;
  /** The page format the file was verified with. Records from before TQP1 lack it and read as not installed. */
  pageFormat: string;
  installedAt: number;
};

export type SvgMushafInstallFailure = 'network' | 'checksum' | 'size' | 'import' | 'unavailable' | 'storage';

export type SvgMushafInstallResult =
  | { status: 'installed' }
  | { status: 'cancelled' }
  | { status: 'waiting_wifi' }
  | { status: 'failed'; reason: SvgMushafInstallFailure };
