import type { WidgetSnapshotWriter } from '../snapshot/publish';

import { requestAndroidWidgetUpdates } from './update';

/**
 * The Android target. It has no store of its own: the MMKV writer already holds the snapshot, and the placed widgets
 * draw from it. Its only job is the redraw (ADR 0035 §4).
 */
export const androidWidgetWriter: WidgetSnapshotWriter = {
  id: 'android',
  refresh: () => requestAndroidWidgetUpdates(),
  write: () => undefined,
};
