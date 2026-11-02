import { storage, storageKeys } from '@/core/storage/mmkv';
import { readSibhaState, readSibhaTodayTotal, recordSibhaTap } from '@/features/sibha/data/store';

import { mergeWidgetTapsFromSnapshot } from './merge-taps';
import { readWidgetSnapshot, writeWidgetSnapshot } from '../snapshot/store';
import { withMisbaha } from '../snapshot/patch';

function readLastMergedWidgetTaps(): number {
  const raw = storage.getNumber(storageKeys.widgets.lastMergedWidgetTaps);
  return typeof raw === 'number' && raw >= 0 ? Math.floor(raw) : 0;
}

function writeLastMergedWidgetTaps(value: number): void {
  storage.set(storageKeys.widgets.lastMergedWidgetTaps, value);
}

/** Cleared with personal data. */
export function clearLastMergedWidgetTaps(): void {
  storage.remove(storageKeys.widgets.lastMergedWidgetTaps);
}

/**
 * Reads `widgetTapsTotal` from the MMKV snapshot and applies new taps to the misbaha store (ADR 0035 §3.5). Call when
 * the app becomes active.
 */
export function mergeIosWidgetTapsOnForeground(now: Date): number {
  const snapshot = readWidgetSnapshot();
  if (snapshot === null) {
    return 0;
  }
  const { applied, lastMergedWidgetTaps } = mergeWidgetTapsFromSnapshot({
    lastMergedWidgetTaps: readLastMergedWidgetTaps(),
    misbaha: snapshot.misbaha,
    recordTap: () => {
      recordSibhaTap(now);
    },
  });
  if (applied === 0) {
    return 0;
  }
  writeLastMergedWidgetTaps(lastMergedWidgetTaps);
  const state = readWidgetSnapshot();
  if (state !== null) {
    const counter = readSibhaState();
    writeWidgetSnapshot(
      withMisbaha(state, {
        count: counter.count,
        target: counter.target,
        todayTotal: readSibhaTodayTotal(now),
        widgetTapsTotal: lastMergedWidgetTaps,
      }),
    );
  }
  return applied;
}
