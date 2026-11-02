import type { WidgetMisbaha } from '../snapshot/types';

import { misbahaAfterWidgetTap } from './patch-misbaha-tap';

/**
 * Applies pending widget «+» taps from `widgetTapsTotal` (ADR 0035 §3.5). The extension only increments
 * `widgetTapsTotal`; the app tracks `lastMergedWidgetTaps` and calls `recordTap` once per new tap.
 */
export function mergeWidgetTapsFromSnapshot(params: {
  misbaha: WidgetMisbaha;
  lastMergedWidgetTaps: number;
  recordTap: () => void;
}): { applied: number; lastMergedWidgetTaps: number } {
  const total = params.misbaha.widgetTapsTotal ?? 0;
  const last = Math.max(0, params.lastMergedWidgetTaps);
  if (total <= last) {
    return { applied: 0, lastMergedWidgetTaps: last };
  }
  const delta = total - last;
  for (let index = 0; index < delta; index += 1) {
    params.recordTap();
  }
  return { applied: delta, lastMergedWidgetTaps: total };
}

/**
 * Patches the stored snapshot after the app applied widget taps to MMKV, so counts stay aligned without a full rebuild.
 */
export function snapshotMisbahaAfterMergedTaps(misbaha: WidgetMisbaha, applied: number): WidgetMisbaha {
  if (applied <= 0) {
    return misbaha;
  }
  let next = misbaha;
  for (let index = 0; index < applied; index += 1) {
    next = misbahaAfterWidgetTap(next);
  }
  return next;
}
