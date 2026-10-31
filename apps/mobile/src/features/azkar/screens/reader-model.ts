import { formatNumber, type Locale } from '@/core/i18n';

import type { ReaderUnit } from '../data/reader-units';

/**
 * Where the reader is. `null` resumes at the first incomplete unit; a number is the unit the user moved to;
 * `'finished'` is the completion screen.
 */
export type ReaderView = number | 'finished' | null;

export type ReaderPosition = { index: number; finished: boolean };

export function completedUnitKeys(rows: readonly { itemKey: string; completedAt: number | null }[]): Set<string> {
  return new Set(rows.filter((row) => row.completedAt !== null).map((row) => row.itemKey));
}

/** The reader's index and whether the completion screen shows. An empty category is finished. */
export function resolveReaderPosition(view: ReaderView, units: readonly ReaderUnit[], completed: ReadonlySet<string>): ReaderPosition {
  const last = Math.max(0, units.length - 1);
  if (units.length === 0) {
    return { index: 0, finished: true };
  }
  if (view === 'finished') {
    return { index: last, finished: true };
  }
  if (typeof view === 'number') {
    return { index: Math.min(Math.max(0, view), last), finished: false };
  }

  const firstIncomplete = units.findIndex((unit) => !completed.has(unit.unitKey));
  if (firstIncomplete === -1) {
    return { index: last, finished: true };
  }
  return { index: firstIncomplete, finished: false };
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
