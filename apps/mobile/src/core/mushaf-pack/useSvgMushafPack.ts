import { File } from 'expo-file-system';
import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { installSvgMushaf } from './install-svg-mushaf';
import { clearInstalledSvgMushaf, getInstalledSvgMushaf } from './installed-store';
import { openSvgMushafPack } from './open-pack';
import { svgMushafPackPath } from './paths';
import { removeSvgMushaf } from './remove-svg-mushaf';
import type { SvgMushafPackReader } from './SvgMushafPackReader';
import {
  abortSvgMushafController,
  finishSvgMushafController,
  IDLE_SVG_MUSHAF_TRANSIENT,
  startSvgMushafController,
  useSvgMushafPackStore,
  type SvgMushafTransient,
} from './svg-mushaf-pack-store';
import type { InstalledSvgMushaf, SvgMushafInstallFailure, SvgMushafInstallResult, SvgMushafKey } from './types';

export type SvgMushafPackStatus = 'absent' | 'downloading' | 'verifying' | 'waiting_wifi' | 'installed' | 'failed' | 'cancelled';

export type SvgMushafPackState = {
  status: SvgMushafPackStatus;
  /** 0..1; 0 unless downloading or verifying. */
  progress: number;
  error: SvgMushafInstallFailure | null;
  installedVersion: number | null;
  availableVersion: number | null;
  updateAvailable: boolean;
  sizeBytes: number | null;
  hasWordBoxes: boolean;
  download: (options?: { allowCellular?: boolean }) => Promise<SvgMushafInstallResult>;
  cancel: () => void;
  remove: () => void;
  reader: SvgMushafPackReader | null;
};

// The installer reports 0.92 when the download has arrived and hashing starts.
const VERIFYING_FRACTION = 0.92;

const runningDownloads = new Map<SvgMushafKey, Promise<SvgMushafInstallResult>>();

/**
 * The state of one riwayah's pack for the UI: what is installed, what the catalogue offers, and the live download.
 * Installed records are not part of the content sync. An update is taken only by an explicit `download()` (ADR 0090, Q7).
 */
export function useSvgMushafPack(key: SvgMushafKey): SvgMushafPackState {
  // Subscribing re-renders the hook when the catalogue or an install changes; the reads below are cheap and run each render.
  useCatalogVersion((state) => state.version);
  useSvgMushafPackStore((state) => state.revision);
  const transient = useSvgMushafPackStore((state) => state.byKey[key] ?? IDLE_SVG_MUSHAF_TRANSIENT);

  const installed = readInstalled(key);
  const catalog = readCatalog(key);
  const status = statusOf(transient, installed !== undefined);
  const reader = useMemo(() => (status === 'installed' ? readReader(key) : null), [key, status]);

  const availableVersion = catalog?.version ?? null;

  return {
    status,
    progress: status === 'downloading' || status === 'verifying' ? transient.progress : 0,
    error: status === 'failed' ? transient.error : null,
    installedVersion: installed?.version ?? null,
    availableVersion,
    updateAvailable: installed !== undefined && availableVersion !== null && availableVersion > installed.version,
    sizeBytes: catalog?.sizeBytes ?? null,
    hasWordBoxes: installed?.hasWordBoxes ?? false,
    download: (options) => download(key, options),
    cancel: () => abortSvgMushafController(key),
    remove: () => {
      removeSvgMushaf(key);
      useSvgMushafPackStore.getState().patch(key, IDLE_SVG_MUSHAF_TRANSIENT);
      useSvgMushafPackStore.getState().bumpRevision();
    },
    reader,
  };
}

function download(key: SvgMushafKey, options?: { allowCellular?: boolean }): Promise<SvgMushafInstallResult> {
  const running = runningDownloads.get(key);
  if (running !== undefined) {
    return running;
  }

  const controller = startSvgMushafController(key);
  useSvgMushafPackStore.getState().patch(key, { phase: 'downloading', progress: 0, error: null });

  const promise = installSvgMushaf(key, {
    allowCellular: options?.allowCellular,
    signal: controller.signal,
    onProgress: (fraction) => {
      useSvgMushafPackStore
        .getState()
        .patch(key, { phase: fraction >= VERIFYING_FRACTION ? 'verifying' : 'downloading', progress: fraction });
    },
  })
    .then((result) => {
      finishSvgMushafController(key);
      const store = useSvgMushafPackStore.getState();
      if (result.status === 'installed') {
        store.patch(key, IDLE_SVG_MUSHAF_TRANSIENT);
        store.bumpRevision();
      } else if (result.status === 'cancelled') {
        store.patch(key, { phase: 'cancelled', progress: 0, error: null });
      } else if (result.status === 'waiting_wifi') {
        store.patch(key, { phase: 'waiting_wifi', progress: 0, error: null });
      } else {
        store.patch(key, { phase: 'failed', progress: 0, error: result.reason });
      }
      return result;
    })
    .finally(() => {
      runningDownloads.delete(key);
    });

  runningDownloads.set(key, promise);
  return promise;
}

/** The installed record, when its file is still there. A record whose file is gone is cleared and reads as absent. */
function readInstalled(key: SvgMushafKey): InstalledSvgMushaf | undefined {
  const record = getInstalledSvgMushaf(key);
  if (record === undefined) {
    return undefined;
  }
  if (!new File(svgMushafPackPath(key, record.version)).exists) {
    clearInstalledSvgMushaf(key);
    return undefined;
  }
  return record;
}

function readCatalog(key: SvgMushafKey): { version: number; sizeBytes: number } | null {
  try {
    const row = openContentDb().executor.get<{ version: number; pack_size_bytes: number }>(
      'SELECT version, pack_size_bytes FROM catalog_resources WHERE "group" = ? AND source_key = ?',
      ['svg_mushafs', key],
    );
    return row === undefined ? null : { version: row.version, sizeBytes: row.pack_size_bytes };
  } catch {
    // The catalogue is not open yet (first launch); no offer is shown until it is.
    return null;
  }
}

function readReader(key: SvgMushafKey): SvgMushafPackReader | null {
  try {
    return openSvgMushafPack(key);
  } catch {
    return null;
  }
}

function statusOf(transient: SvgMushafTransient, installed: boolean): SvgMushafPackStatus {
  switch (transient.phase) {
    case 'downloading':
      return 'downloading';
    case 'verifying':
      return 'verifying';
    case 'waiting_wifi':
      return 'waiting_wifi';
    case 'failed':
      return installed ? 'installed' : 'failed';
    case 'cancelled':
      return installed ? 'installed' : 'cancelled';
    default:
      return installed ? 'installed' : 'absent';
  }
}
