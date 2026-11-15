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

/** The record of the installed version of one riwayah, kept in MMKV. */
export type InstalledSvgMushaf = {
  key: SvgMushafKey;
  resourceId: number;
  version: number;
  sha256: string;
  sizeBytes: number;
  hasWordBoxes: boolean;
  installedAt: number;
};

export type SvgMushafInstallFailure = 'network' | 'checksum' | 'size' | 'import' | 'unavailable' | 'storage';

export type SvgMushafInstallResult =
  | { status: 'installed' }
  | { status: 'cancelled' }
  | { status: 'waiting_wifi' }
  | { status: 'failed'; reason: SvgMushafInstallFailure };
