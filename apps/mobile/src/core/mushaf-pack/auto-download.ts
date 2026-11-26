import { useReaderSettings } from '@/features/reader/settings';

import type { SvgMushafInstallResult, SvgMushafKey } from './types';
import { isSvgMushafDownloadRunning, isSvgMushafUpdateAvailable, readInstalled, startSvgMushafDownload } from './useSvgMushafPack';

export type AutoDownloadDeps = {
  selectedKey: () => SvgMushafKey;
  isInstalled: (key: SvgMushafKey) => boolean;
  /** The catalogue has a newer version than the installed one. */
  updateAvailable: (key: SvgMushafKey) => boolean;
  isRunning: (key: SvgMushafKey) => boolean;
  start: (key: SvgMushafKey) => Promise<SvgMushafInstallResult>;
};

const defaultDeps: AutoDownloadDeps = {
  // The reader's riwayah keys are the same five as the pack keys (ADR 0090), so no mapping is needed.
  selectedKey: () => useReaderSettings.getState().mushaf,
  isInstalled: (key) => readInstalled(key) !== undefined,
  updateAvailable: isSvgMushafUpdateAvailable,
  isRunning: isSvgMushafDownloadRunning,
  start: (key) => startSvgMushafDownload(key),
};

/**
 * Starts the download of the selected riwayah when it is not installed, or when the catalogue has a newer version, and
 * it is not already downloading (ADR 0090 amendment items 5 and 13). An update replaces the old file only once it is
 * verified; until then the installed version keeps drawing.
 * Not awaited by the caller: the install waits for Wi-Fi itself when the Wi-Fi-only setting is on. Never throws.
 */
export async function ensureSelectedMushafDownloaded(deps: AutoDownloadDeps = defaultDeps): Promise<void> {
  try {
    const key = deps.selectedKey();
    if ((deps.isInstalled(key) && !deps.updateAvailable(key)) || deps.isRunning(key)) {
      return;
    }
    deps.start(key).catch(logDev);
  } catch (error) {
    logDev(error);
  }
}

function logDev(error: unknown): void {
  if (__DEV__) {
    console.warn('The selected SVG mushaf could not be downloaded.', error);
  }
}
