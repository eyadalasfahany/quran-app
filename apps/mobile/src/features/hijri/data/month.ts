import { shiftLocalDay, toHijri, type HijriDate } from './hijri-date';

export type HijriMonthDay = {
  /** The Gregorian day for this Hijri day (local, at noon). */
  gregorian: Date;
  hijri: HijriDate;
};

export type HijriMonth = {
  year: number;
  month: number;
  /** 29 or 30. */
  length: number;
  days: HijriMonthDay[];
};

// Approximate Gregorian date of 1 Muharram 1 AH (16 July 622, Julian; local noon). Only the search start depends on it.
const EPOCH_MS = new Date(622, 6, 19, 12).getTime();
const YEAR_DAYS = 354.36667;
const MONTH_DAYS = 29.5306;
const SEARCH_WINDOW = 45;

function approximateStart(year: number, month: number): Date {
  const days = (year - 1) * YEAR_DAYS + (month - 1) * MONTH_DAYS;
  return new Date(EPOCH_MS + Math.round(days) * 86_400_000);
}

/**
 * The Gregorian day on which the displayed (adjusted) Hijri month begins. Searches a window around the approximate
 * start, so it does not depend on any table. Null when the calendar is unavailable.
 */
function findMonthStart(year: number, month: number, adjustDays: number): Date | null {
  const guess = approximateStart(year, month);
  for (let offset = -SEARCH_WINDOW; offset <= SEARCH_WINDOW; offset += 1) {
    const candidate = shiftLocalDay(guess, offset);
    const hijri = toHijri(candidate, adjustDays);
    if (hijri === null) {
      return null;
    }
    if (hijri.year === year && hijri.month === month && hijri.day === 1) {
      return candidate;
    }
  }
  return null;
}

/**
 * One Hijri month as a grid of days (screens/, #HijriCalendar). `adjustDays` shifts the Gregorian day
 * before the conversion, so the month shown matches the adjusted date everywhere. Null when the calendar is unavailable.
 */
export function hijriMonth(year: number, month: number, adjustDays: number): HijriMonth | null {
  const start = findMonthStart(year, month, adjustDays);
  if (!start) {
    return null;
  }
  const days: HijriMonthDay[] = [];
  // A month is 29 or 30 days: the 30th exists only if the 30th day of the month is the same month.
  for (let index = 0; index < 30; index += 1) {
    const gregorian = shiftLocalDay(start, index);
    const hijri = toHijri(gregorian, adjustDays);
    if (hijri === null || hijri.month !== month || hijri.year !== year) {
      break;
    }
    days.push({ gregorian, hijri });
  }
  return { year, month, length: days.length, days };
}

