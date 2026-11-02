/**
 * Hijri dates on device, from the Umm al-Qura calendar that ICU ships (ADR 0030 §6, ADR 0048 H1). No network and no
 * drift: the platform computes the date. A calendar the engine does not provide yields null, and the caller hides the
 * Hijri surface (a platform capability check, not a feature switch).
 */

export type HijriDate = {
  year: number;
  /** 1 to 12. */
  month: number;
  /** 1 to 30. */
  day: number;
};

export const HIJRI_CALENDAR = 'islamic-umalqura';
export const ADJUST_MIN = -2;
export const ADJUST_MAX = 2;


let formatter: Intl.DateTimeFormat | null | undefined;

/** The shared formatter, created once. Null when the engine ignores the calendar (the mocked-Intl case). */
function getFormatter(): Intl.DateTimeFormat | null {
  if (formatter !== undefined) {
    return formatter;
  }
  try {
    const created = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    formatter = created.resolvedOptions().calendar === HIJRI_CALENDAR ? created : null;
  } catch {
    formatter = null;
  }
  return formatter;
}

/** Test seam: forget the cached formatter so a test can mock `Intl` and see the unavailable result. */
export function resetHijriFormatterForTests(): void {
  formatter = undefined;
}

export function clampAdjustDays(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(ADJUST_MAX, Math.max(ADJUST_MIN, Math.round(value)));
}

/** The local calendar day `days` after `date`, at noon, so a DST day of 23 or 25 hours never moves it. */
export function shiftLocalDay(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0, 0);
}

/**
 * The Hijri date shown for `date` with the user's adjustment (−2 to +2 days, applied to the Gregorian day before the
 * conversion, so a +1 shows the date one day later). Returns null when the calendar is unavailable.
 */
export function toHijri(date: Date, adjustDays: number): HijriDate | null {
  const fmt = getFormatter();
  if (!fmt) {
    return null;
  }
  const shifted = shiftLocalDay(date, clampAdjustDays(adjustDays));
  const parts = fmt.formatToParts(shifted);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value);
  const year = read('year');
  const month = read('month');
  const day = read('day');
  if (![year, month, day].every((n) => Number.isInteger(n))) {
    return null;
  }
  return { year, month, day };
}

export function isSameHijriDay(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}


/** True when the device computes the Umm al-Qura calendar. The Hijri surfaces hide when it does not (a capability check). */
export function isHijriCalendarAvailable(): boolean {
  return getFormatter() !== null;
}
