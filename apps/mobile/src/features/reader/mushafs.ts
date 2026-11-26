/** The five riwayat the reader can pick (ADR 0090 decision 2). */
export const MUSHAF_KEYS = ['hafs', 'warsh', 'qalun', 'shubah', 'duri'] as const;

export type MushafKey = (typeof MUSHAF_KEYS)[number];

/** The riwayat offered in pickers. al-Duri is hidden until its artwork is settled (ADR 0090 amendment 26 Nov 2026, item 12). */
export const PICKABLE_MUSHAF_KEYS: readonly MushafKey[] = MUSHAF_KEYS.filter((key) => key !== 'duri');

export const DEFAULT_MUSHAF: MushafKey = 'hafs';

/** The Hijri year of each mushaf's King Fahd Complex edition. */
export const MUSHAF_EDITION_YEAR: Record<MushafKey, number> = {
  hafs: 1441,
  warsh: 1442,
  qalun: 1443,
  shubah: 1443,
  duri: 1443,
};

/** A saved choice the reader can still have: a hidden riwayah (al-Duri) is not one, so it reads as the default. */
export function isMushafKey(value: unknown): value is MushafKey {
  return typeof value === 'string' && (PICKABLE_MUSHAF_KEYS as readonly string[]).includes(value);
}
