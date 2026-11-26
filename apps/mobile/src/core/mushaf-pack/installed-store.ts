import { storage, storageKeys } from '@/core/storage/mmkv';

import { SVG_MUSHAF_PAGE_FORMAT, type InstalledSvgMushaf, type SvgMushafKey } from './types';

/** The installed record of one riwayah, or undefined. A malformed or wrong-key record reads as undefined. */
export function getInstalledSvgMushaf(key: SvgMushafKey): InstalledSvgMushaf | undefined {
  const raw = storage.getString(storageKeys.svgMushaf.installed(key));
  if (raw === undefined) {
    return undefined;
  }
  try {
    const value = JSON.parse(raw) as Partial<InstalledSvgMushaf> | null;
    if (
      value === null ||
      typeof value !== 'object' ||
      value.key !== key ||
      typeof value.resourceId !== 'number' ||
      typeof value.version !== 'number' ||
      typeof value.sha256 !== 'string' ||
      typeof value.sizeBytes !== 'number' ||
      typeof value.hasWordBoxes !== 'boolean' ||
      value.pageFormat !== SVG_MUSHAF_PAGE_FORMAT ||
      typeof value.installedAt !== 'number'
    ) {
      return undefined;
    }
    return value as InstalledSvgMushaf;
  } catch {
    return undefined;
  }
}

export function setInstalledSvgMushaf(record: InstalledSvgMushaf): void {
  storage.set(storageKeys.svgMushaf.installed(record.key), JSON.stringify(record));
}

export function clearInstalledSvgMushaf(key: SvgMushafKey): void {
  storage.remove(storageKeys.svgMushaf.installed(key));
}
