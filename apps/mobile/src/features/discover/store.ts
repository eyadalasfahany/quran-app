import { storage, storageKeys } from '@/core/storage/mmkv';

import { DISCOVER_ENTRIES, isDiscoverId, type DiscoverId } from './registry';

export type DiscoverState = {
  done: readonly DiscoverId[];
  /** Null until the person finishes the set or hides the card; then every registry id at that moment. */
  acknowledged: readonly DiscoverId[] | null;
  hidden: boolean;
  /** The guided tour's current step, or null when no tour runs (ADR 0053, amended 3 Nov 2026). */
  tourStep: DiscoverId | null;
};

function readStringArray(key: string): string[] | null {
  const raw = storage.getString(key);
  if (raw === undefined) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : null;
  } catch {
    return null;
  }
}

function writeStringArray(key: string, values: readonly string[]): void {
  storage.set(key, JSON.stringify(values));
}

export function readDiscoverState(): DiscoverState {
  const done = (readStringArray(storageKeys.discover.done) ?? []).filter(isDiscoverId);
  const acknowledgedRaw = readStringArray(storageKeys.discover.acknowledged);
  const acknowledged = acknowledgedRaw === null ? null : acknowledgedRaw.filter(isDiscoverId);
  const stepRaw = storage.getString(storageKeys.discover.tourStep);
  return {
    done,
    acknowledged,
    hidden: storage.getBoolean(storageKeys.discover.hidden) === true,
    tourStep: stepRaw !== undefined && isDiscoverId(stepRaw) ? stepRaw : null,
  };
}

// Subscribers re-read the state on every change. The version counts the changes.
const listeners = new Set<() => void>();
let version = 0;
// The last snapshot and the raw stored values it was read from. useSyncExternalStore compares snapshots by reference,
// so a new object is made only when a stored value changed, by this module or any other writer.
let snapshot: { raw: string; state: DiscoverState } | null = null;

function notify(): void {
  version += 1;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeDiscover(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDiscoverVersion(): number {
  return version;
}

/** The stored state for useSyncExternalStore: the same object until a stored value changes. */
export function getDiscoverSnapshot(): DiscoverState {
  const keys = storageKeys.discover;
  const raw = JSON.stringify([
    storage.getString(keys.done),
    storage.getString(keys.acknowledged),
    storage.getBoolean(keys.hidden),
    storage.getString(keys.tourStep),
  ]);
  if (snapshot === null || snapshot.raw !== raw) {
    snapshot = { raw, state: readDiscoverState() };
  }
  return snapshot.state;
}

/**
 * Records that the person completed a row (ADR 0053 §2). Called from the feature's real action, never from a store
 * setter that also runs during onboarding or a background install. A row that is already done is a no-op.
 */
export function markDiscovered(id: DiscoverId): void {
  const current = readStringArray(storageKeys.discover.done) ?? [];
  if (!current.includes(id)) {
    writeStringArray(storageKeys.discover.done, [...current, id]);
  }
  // Doing the tour's current step moves the tour on, even when the row was already done.
  if (storage.getString(storageKeys.discover.tourStep) === id) {
    advanceTour(id);
    return;
  }
  if (!current.includes(id)) {
    notify();
  }
}

/**
 * The step after `from` in list order that is not done yet, or null at the end. The tour only moves forward. A skipped
 * step counts as done, so it is not offered again.
 */
export function nextTourStep(from: DiscoverId, done: readonly DiscoverId[]): DiscoverId | null {
  const index = DISCOVER_ENTRIES.findIndex((entry) => entry.id === from);
  const next = DISCOVER_ENTRIES.slice(index + 1).find((entry) => !done.includes(entry.id));
  return next?.id ?? null;
}

/** After a step's action, the next step's screen opens after this pause, so the person sees the action register. */
export const TOUR_ADVANCE_DELAY_MS = 900;

// How the last tour ended: by running out of steps, or by «إنهاء». The navigator returns to the list only after the first.
let tourFinished = false;

/** Whether the tour that just ended ran out of steps (rather than being stopped with «إنهاء»). */
export function lastTourFinished(): boolean {
  return tourFinished;
}

function setTourStep(step: DiscoverId | null): void {
  if (step === null) {
    storage.remove(storageKeys.discover.tourStep);
  } else {
    storage.set(storageKeys.discover.tourStep, step);
  }
  notify();
}

function advanceTour(from: DiscoverId): void {
  const next = nextTourStep(from, readDiscoverState().done);
  tourFinished = next === null;
  setTourStep(next);
}

/** Starts the guided tour at `id`: the tour navigator opens that step's screen, where its tip shows. */
export function startTour(id: DiscoverId): void {
  tourFinished = false;
  setTourStep(id);
}

/** «تخطي»: the step counts as seen (done), and the tour moves on (developer, 3 Nov 2026). */
export function skipTourStep(): void {
  const step = readDiscoverState().tourStep;
  if (step !== null) {
    markDiscovered(step);
  }
}

/** «التالي» on a show-and-tell step: it is done, and the tour moves on. */
export function completeTourStep(): void {
  const step = readDiscoverState().tourStep;
  if (step !== null) {
    markDiscovered(step);
  }
}

/** «إنهاء»: the tour stops where it is. */
export function endTour(): void {
  tourFinished = false;
  setTourStep(null);
}

/** The person finished the set («تم»): every current id is acknowledged, so the done state goes away. */
export function finishDiscoverSet(): void {
  writeStringArray(
    storageKeys.discover.acknowledged,
    DISCOVER_ENTRIES.map((entry) => entry.id),
  );
  notify();
}

/** The person hid the card («إخفاء»). It comes back only when an update adds a row. */
export function hideDiscoverCard(): void {
  finishDiscoverSet();
  storage.set(storageKeys.discover.hidden, true);
  notify();
}
