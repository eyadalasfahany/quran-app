/** The five riwayat the reader can pick (ADR 0090 decision 2). */
export const MUSHAF_KEYS = ['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as const;

export type MushafKey = (typeof MUSHAF_KEYS)[number];

export const DEFAULT_MUSHAF: MushafKey = 'hafs';

/** The Hijri year of each mushaf's King Fahd Complex edition. */
export const MUSHAF_EDITION_YEAR: Record<MushafKey, number> = {
  hafs: 1441,
  warsh: 1442,
  qalun: 1443,
  shubah: 1443,
  duri: 1443,
};

export function isMushafKey(value: unknown): value is MushafKey {
  return typeof value === 'string' && (MUSHAF_KEYS as readonly string[]).includes(value);
}
