import { formatNumber, type Locale } from '@/core/i18n';

import type { ReaderUnit } from './data/reader-units';

/**
 * Where the reader is. `null` resumes at the first incomplete unit; a number is the unit the user moved to;
 * `'finished'` is the completion screen.
 */
export type ReaderView = number | 'finished' | null;

export type ReaderPosition = { index: number; finished: boolean };

export function completedUnitKeys(rows: readonly { itemKey: string; completedAt: number | null }[]): Set<string> {
  return new Set(rows.filter((row) => row.completedAt !== null).map((row) => row.itemKey));
}

/**
 * The reader's index and whether the completion screen shows. An empty category is finished. Once every unit is done,
 * the reader stays on the last unit with the «إتمام» action; the completion screen shows only when the session is
 * marked complete (`sessionMarked`).
 */
export function resolveReaderPosition(
  view: ReaderView,
  units: readonly ReaderUnit[],
  completed: ReadonlySet<string>,
  sessionMarked = false,
): ReaderPosition {
  const last = Math.max(0, units.length - 1);
  if (units.length === 0 || sessionMarked) {
    return { index: last, finished: true };
  }
  if (view === 'finished') {
    return { index: last, finished: true };
  }
  if (typeof view === 'number') {
    return { index: Math.min(Math.max(0, view), last), finished: false };
  }

  const firstIncomplete = units.findIndex((unit) => !completed.has(unit.unitKey));
  if (firstIncomplete === -1) {
    return { index: last, finished: false };
  }
  return { index: firstIncomplete, finished: false };
}

/**
 * Whether a unit shows a repetition line: a sourced count above 1 only (a group of one has none). The reader itself
 * always shows the ring, for every unit (ADR 0031 §6).
 */
export function showsCounter(requiredCount: number | null): boolean {
  return requiredCount !== null && requiredCount > 1;
}

/** Whether every unit of the session is done. An empty session is not. */
export function allUnitsDone(units: readonly ReaderUnit[], completed: ReadonlySet<string>): boolean {
  return units.length > 0 && units.every((unit) => completed.has(unit.unitKey));
}

/**
 * The unit the reader moves to once `from` completes: the next unit not yet done, else the first one not yet done
 * (the reader resumes there), else the last unit, where the mark-complete action shows once every unit is done. A
 * finished unit is never the destination, so the reader does not land on a dead tap surface.
 */
export function nextUnitIndex(units: readonly ReaderUnit[], completed: ReadonlySet<string>, from: number): number {
  const last = Math.max(0, units.length - 1);
  if (units.length === 0 || allUnitsDone(units, completed)) {
    return last;
  }
  const later = units.slice(from + 1).findIndex((unit) => !completed.has(unit.unitKey));
  if (later !== -1) {
    return from + 1 + later;
  }
  return units.findIndex((unit) => !completed.has(unit.unitKey));
}

/** The direction of a move, for motion: forward (1) in reading order, back (-1). */
export function moveDirection(from: number, to: number): 1 | -1 {
  return to >= from ? 1 : -1;
}

/** Share of the progress bar and the «٥ من ٢٤» count: the unit being read, or every unit when finished. */
export function readerProgress(position: ReaderPosition, total: number): { current: number; fraction: number } {
  if (total === 0) {
    return { current: 0, fraction: 0 };
  }
  const current = position.finished ? total : position.index + 1;
  return { current, fraction: current / total };
}

/** A sourced reference that is a plain number is shown with Arabic-Indic digits in Arabic. Other text is kept. */
export function referenceNumber(reference: string, locale: Locale): string {
  return /^\d+$/.test(reference) ? formatNumber(Number(reference), locale) : reference;
}
