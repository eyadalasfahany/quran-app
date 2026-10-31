import { timesFor } from '@/features/salah/data/prayer-times';

import {
  AzkarProgressError,
  TAP_GUARD_MS,
  applyTap,
  categoryProgress,
  emptyTapState,
  periodKey,
  pickLastActiveScope,
  scopeKeyForCategory,
  scopeKeyForEntry,
} from './progress';

const LONDON = { lat: 51.5074, lng: -0.1278 };

const originalTz = process.env.TZ;

function setTimezone(zone: string | undefined): void {
  if (zone === undefined) {
    delete process.env.TZ;
  } else {
    process.env.TZ = zone;
  }
}

afterEach(() => {
  setTimezone(originalTz);
});

describe('scope keys', () => {
  it('prefixes category and entry scopes', () => {
    expect(scopeKeyForCategory('morning')).toBe('category:morning');
    expect(scopeKeyForEntry('fixture:entry-001')).toBe('entry:fixture:entry-001');
  });
});

describe('periodKey', () => {
  it('uses the local calendar date for daily', () => {
    expect(periodKey('daily', new Date(2026, 9, 31, 0, 5))).toBe('2026-10-31');
    expect(periodKey('daily', new Date(2026, 9, 31, 23, 55))).toBe('2026-10-31');
  });

  it('uses the date of the evening for nightly, with the noon edge', () => {
    expect(periodKey('nightly', new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31');
    expect(periodKey('nightly', new Date(2026, 9, 31, 6, 0))).toBe('2026-10-30');
    expect(periodKey('nightly', new Date(2026, 9, 31, 11, 59))).toBe('2026-10-30');
    expect(periodKey('nightly', new Date(2026, 9, 31, 12, 0))).toBe('2026-10-31');
  });

  it('is always session for session scopes', () => {
    expect(periodKey('session', new Date(2026, 9, 31, 9, 0))).toBe('session');
  });

  it('falls back to the local day for per_prayer without coordinates', () => {
    const now = new Date(2026, 9, 31, 15, 0);
    expect(periodKey('per_prayer', now)).toBe('2026-10-31');
    expect(periodKey('per_prayer', now, { coords: null })).toBe('2026-10-31');
  });

  it('keys per_prayer by the most recent prayer passed', () => {
    const times = timesFor(new Date(2026, 9, 31, 12, 0), LONDON);
    const afterAsr = new Date(times.asr.getTime() + 60_000);
    const beforeAsr = new Date(times.asr.getTime() - 60_000);

    expect(periodKey('per_prayer', afterAsr, { coords: LONDON })).toBe('2026-10-31:asr');
    expect(periodKey('per_prayer', beforeAsr, { coords: LONDON })).toBe('2026-10-31:dhuhr');
  });

  it('keys a time before fajr by yesterday isha', () => {
    const fajr = timesFor(new Date(2026, 9, 31, 12, 0), LONDON).fajr;
    const beforeFajr = new Date(fajr.getTime() - 30 * 60_000);

    expect(periodKey('per_prayer', beforeFajr, { coords: LONDON })).toBe('2026-10-30:isha');
  });

  it('keeps the local date across the London spring-forward day', () => {
    setTimezone('Europe/London');

    expect(periodKey('daily', new Date(2026, 2, 29, 0, 30))).toBe('2026-03-29');
    expect(periodKey('daily', new Date(2026, 2, 29, 23, 30))).toBe('2026-03-29');
    expect(periodKey('nightly', new Date(2026, 2, 29, 0, 30))).toBe('2026-03-28');
    expect(periodKey('nightly', new Date(2026, 2, 29, 12, 0))).toBe('2026-03-29');
  });
});

describe('applyTap', () => {
  it('increments a sourced count and completes at the count, never past it', () => {
    const first = applyTap(emptyTapState(), 2, 1_000);
    expect(first).toMatchObject({ accepted: true, completedNow: false });
    expect(first.state).toEqual({ currentCount: 1, completedAt: null, updatedAt: 1_000 });

    const second = applyTap(first.state, 2, 1_000 + TAP_GUARD_MS);
    expect(second).toMatchObject({ accepted: true, completedNow: true });
    expect(second.state).toEqual({
      currentCount: 2,
      completedAt: 1_000 + TAP_GUARD_MS,
      updatedAt: 1_000 + TAP_GUARD_MS,
    });
  });

  it('marks a null-count unit done with one tap and keeps the count at 0', () => {
    const result = applyTap(emptyTapState(), null, 5_000);

    expect(result).toMatchObject({ accepted: true, completedNow: true });
    expect(result.state).toEqual({ currentCount: 0, completedAt: 5_000, updatedAt: 5_000 });
  });

  it('is a no-op after completion', () => {
    const done = applyTap(emptyTapState(), null, 5_000).state;
    const later = applyTap(done, null, 9_000);

    expect(later).toEqual({ state: done, accepted: false, completedNow: false });
  });

  it('ignores a tap within 120 ms of the previous accepted tap', () => {
    const first = applyTap(emptyTapState(), 33, 10_000).state;

    const tooSoon = applyTap(first, 33, 10_000 + TAP_GUARD_MS - 1);
    expect(tooSoon).toEqual({ state: first, accepted: false, completedNow: false });

    const onTime = applyTap(first, 33, 10_000 + TAP_GUARD_MS);
    expect(onTime).toMatchObject({ accepted: true });
    expect(onTime.state.currentCount).toBe(2);
  });

  it('does not block taps when the clock has gone backwards', () => {
    const state = { currentCount: 1, completedAt: null, updatedAt: 10_000 };
    expect(applyTap(state, 5, 9_000)).toMatchObject({ accepted: true });
  });

  it('rejects an invalid sourced count rather than defaulting it', () => {
    expect(() => applyTap(emptyTapState(), 0, 1)).toThrow(AzkarProgressError);
    expect(() => applyTap(emptyTapState(), 2.5, 1)).toThrow(AzkarProgressError);
  });
});

describe('categoryProgress', () => {
  it('counts completed units out of the category units', () => {
    const units = [{ unitKey: 'a' }, { unitKey: 'b' }, { unitKey: 'c' }];
    const rows = [
      { itemKey: 'a', completedAt: 1 },
      { itemKey: 'b', completedAt: null },
      { itemKey: 'x', completedAt: 1 },
    ];

    expect(categoryProgress(units, rows)).toEqual({ done: 1, total: 3 });
    expect(categoryProgress(units, [])).toEqual({ done: 0, total: 3 });
  });
});

describe('pickLastActiveScope', () => {
  const resolve = (scopeKey: string) => {
    if (scopeKey === 'category:morning') {
      return { periodKey: '2026-10-31', total: 3 };
    }
    if (scopeKey === 'entry:fixture:entry-001') {
      return { periodKey: 'session', total: 2 };
    }
    return null;
  };

  it('picks the newest scope with an incomplete unit in its current period', () => {
    const picked = pickLastActiveScope(
      [
        { scopeKey: 'entry:fixture:entry-001', periodKey: 'session', completedUnits: 1, updatedAt: 100 },
        { scopeKey: 'category:morning', periodKey: '2026-10-31', completedUnits: 1, updatedAt: 200 },
      ],
      resolve,
    );

    expect(picked).toEqual({ scopeKey: 'category:morning', periodKey: '2026-10-31' });
  });

  it('skips completed scopes, stale periods and unknown scopes', () => {
    const picked = pickLastActiveScope(
      [
        { scopeKey: 'category:morning', periodKey: '2026-10-30', completedUnits: 1, updatedAt: 500 },
        { scopeKey: 'category:gone', periodKey: 'session', completedUnits: 1, updatedAt: 400 },
        { scopeKey: 'entry:fixture:entry-001', periodKey: 'session', completedUnits: 2, updatedAt: 300 },
      ],
      resolve,
    );

    expect(picked).toBeNull();
  });
});
