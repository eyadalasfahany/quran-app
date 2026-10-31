import { timesFor, prevPrayer } from '@/features/salah/data/prayer-times';
import { toLocalDateString } from '@/features/khatma/data/plan';

import type { AzkarProgressPeriod } from './model';

/** A tap within this many milliseconds of the previous accepted tap on the same unit is ignored. */
export const TAP_GUARD_MS = 120;

/**
 * The reserved item key of a session's «إتمام» marker: the whole session is complete for its scope and period.
 * It is never a unit's key. Summaries and counts leave it out, so it adds no unit to a total.
 */
export const SESSION_UNIT_KEY = '__session__';

export class AzkarProgressError extends Error {
  constructor(readonly code: 'required_count_invalid') {
    super(code);
    this.name = 'AzkarProgressError';
  }
}

export type Coordinates = { lat: number; lng: number };

export type PeriodContext = {
  /** Stored coordinates for prayer-relative periods. Without them, `per_prayer` falls back to the local day. */
  coords?: Coordinates | null;
};

export function scopeKeyForCategory(categoryId: string): string {
  return `category:${categoryId}`;
}

export function scopeKeyForEntry(entryKey: string): string {
  return `entry:${entryKey}`;
}

/**
 * The period a progress row belongs to. A UX bookkeeping key only; nothing here claims when a dhikr is due.
 * - `daily`: the local calendar date.
 * - `nightly`: the date of the evening; before 12:00 local, the previous date.
 * - `per_prayer`: `YYYY-MM-DD:<prayer>` for the most recent prayer passed (Salah engine), or the local date
 *   without coordinates.
 * - `session`: kept until the user resets or completes.
 */
export function periodKey(period: AzkarProgressPeriod, now: Date, context: PeriodContext = {}): string {
  switch (period) {
    case 'session':
      return 'session';
    case 'daily':
      return toLocalDateString(now);
    case 'nightly': {
      const evening = new Date(now.getTime());
      if (now.getHours() < 12) {
        evening.setDate(evening.getDate() - 1);
      }
      return toLocalDateString(evening);
    }
    case 'per_prayer': {
      const coords = context.coords;
      if (coords === null || coords === undefined) {
        return toLocalDateString(now);
      }
      const prayer = prevPrayer(timesFor(now, coords), now, coords);
      return `${toLocalDateString(prayer.time)}:${prayer.name}`;
    }
  }
}

/** The state of one unit's row. A missing row is `emptyTapState()`. */
export type TapState = {
  currentCount: number;
  completedAt: number | null;
  /** Time of the last accepted tap (or of the completion), used by the double-tap guard. */
  updatedAt: number | null;
};

export type TapResult = {
  state: TapState;
  accepted: boolean;
  completedNow: boolean;
};

export function emptyTapState(): TapState {
  return { currentCount: 0, completedAt: null, updatedAt: null };
}

/**
 * One tap on a unit.
 * - With a sourced count: increments `currentCount`, never past the count; completes when it reaches it.
 * - With a `null` count: one tap marks the unit done; `currentCount` stays 0.
 * - After completion: a no-op.
 * - Within `TAP_GUARD_MS` of the previous accepted tap: ignored.
 */
export function applyTap(state: TapState, requiredCount: number | null, now: number): TapResult {
  if (requiredCount !== null && (!Number.isInteger(requiredCount) || requiredCount < 1)) {
    throw new AzkarProgressError('required_count_invalid');
  }

  const ignored: TapResult = { state, accepted: false, completedNow: false };
  if (state.completedAt !== null) {
    return ignored;
  }

  if (state.updatedAt !== null) {
    const elapsed = now - state.updatedAt;
    if (elapsed >= 0 && elapsed < TAP_GUARD_MS) {
      return ignored;
    }
  }

  if (requiredCount === null) {
    return {
      state: { currentCount: 0, completedAt: now, updatedAt: now },
      accepted: true,
      completedNow: true,
    };
  }

  const currentCount = Math.min(state.currentCount + 1, requiredCount);
  const done = currentCount >= requiredCount;
  return {
    state: { currentCount, completedAt: done ? now : null, updatedAt: now },
    accepted: true,
    completedNow: done,
  };
}

/** Completed units out of the category's units, for the current period's rows. */
export function categoryProgress(
  units: readonly { unitKey: string }[],
  rows: readonly { itemKey: string; completedAt: number | null }[],
): { done: number; total: number } {
  const completed = new Set(rows.filter((row) => row.completedAt !== null).map((row) => row.itemKey));
  const done = units.filter((unit) => completed.has(unit.unitKey)).length;
  return { done, total: units.length };
}

/** Per (scope, period) summary used to find the scope to continue. */
export type ScopeSummary = {
  scopeKey: string;
  periodKey: string;
  completedUnits: number;
  updatedAt: number;
};

/** The current period and unit total for a scope, as the caller resolves them from content. */
export type ScopeResolution = { periodKey: string; total: number };

/**
 * The scope with the newest activity that still has an incomplete unit in its current period. Summaries for
 * periods that are no longer current, and scopes that cannot be resolved, are skipped.
 */
export function pickLastActiveScope(
  summaries: readonly ScopeSummary[],
  resolve: (scopeKey: string) => ScopeResolution | null,
): { scopeKey: string; periodKey: string } | null {
  let best: ScopeSummary | null = null;

  for (const summary of summaries) {
    const current = resolve(summary.scopeKey);
    if (current === null || current.periodKey !== summary.periodKey) {
      continue;
    }
    if (summary.completedUnits >= current.total) {
      continue;
    }
    if (best === null || summary.updatedAt > best.updatedAt) {
      best = summary;
    }
  }

  return best === null ? null : { scopeKey: best.scopeKey, periodKey: best.periodKey };
}

/** Completed units of one scope in one period, from the per (scope, period) summaries. */
export function completedUnitsIn(summaries: readonly ScopeSummary[], scopeKey: string, periodKey: string): number {
  return summaries
    .filter((summary) => summary.scopeKey === scopeKey && summary.periodKey === periodKey)
    .reduce((total, summary) => total + summary.completedUnits, 0);
}
