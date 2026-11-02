import { shiftLocalDay, toHijri, type HijriDate } from './hijri-date';

/**
 * The agreed occasion dates only (ADR 0048, decision 3): 1 and 10 Muharram, 1 Ramadan, 1 Shawwal, 9 and 10 Dhul Hijjah,
 * and the white days 13 to 15 of every month. No other dates, and no text about virtue.
 */
export type OccasionId =
  | 'muharram1'
  | 'muharram10'
  | 'ramadan1'
  | 'shawwal1'
  | 'dhulHijjah9'
  | 'dhulHijjah10'
  | 'whiteDay13'
  | 'whiteDay14'
  | 'whiteDay15';

type OccasionRule = { id: OccasionId; month: number | null; day: number };

// month null means every month.
export const OCCASION_RULES: readonly OccasionRule[] = [
  { id: 'muharram1', month: 1, day: 1 },
  { id: 'muharram10', month: 1, day: 10 },
  { id: 'ramadan1', month: 9, day: 1 },
  { id: 'shawwal1', month: 10, day: 1 },
  { id: 'dhulHijjah9', month: 12, day: 9 },
  { id: 'dhulHijjah10', month: 12, day: 10 },
  { id: 'whiteDay13', month: null, day: 13 },
  { id: 'whiteDay14', month: null, day: 14 },
  { id: 'whiteDay15', month: null, day: 15 },
];

export type OccasionOccurrence = {
  id: OccasionId;
  /** The local Gregorian day (noon). */
  gregorian: Date;
  /** The adjusted Hijri date shown for that day. */
  hijri: HijriDate;
};

// Far enough to reach the next 1 Ramadan or 1 Shawwal, whatever the month lengths.
const SCAN_DAYS = 400;

function matches(rule: OccasionRule, hijri: HijriDate): boolean {
  return hijri.day === rule.day && (rule.month === null || hijri.month === rule.month);
}

/**
 * The next `count` occasions from `from` (the day itself included), in date order. The adjustment shifts the Gregorian
 * day before the conversion, so an occasion moves by the adjustment's days, never its Hijri number. Empty when the
 * calendar is unavailable.
 */
export function upcomingOccasions(from: Date, adjustDays: number, count: number): OccasionOccurrence[] {
  const result: OccasionOccurrence[] = [];
  if (count <= 0) {
    return result;
  }
  const start = shiftLocalDay(from, 0);
  for (let offset = 0; offset < SCAN_DAYS && result.length < count; offset += 1) {
    const gregorian = shiftLocalDay(start, offset);
    const hijri = toHijri(gregorian, adjustDays);
    if (hijri === null) {
      return [];
    }
    for (const rule of OCCASION_RULES) {
      if (matches(rule, hijri)) {
        result.push({ id: rule.id, gregorian, hijri });
      }
    }
  }
  return result.slice(0, count);
}

/** The occasion ids that fall on a Hijri day, for markers in the month grid. */
export function occasionsOnDay(hijri: HijriDate): OccasionId[] {
  return OCCASION_RULES.filter((rule) => matches(rule, hijri)).map((rule) => rule.id);
}
