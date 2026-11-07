import type { Locale } from '@/core/i18n/locale';

import { shiftLocalDay, toHijri, type HijriDate } from './hijri-date';
import type { HijriMonth } from './month';
import { occasionsOnDay, type OccasionId, type OccasionOccurrence } from './occasions';

/** Week starts on Saturday in Arabic and Sunday in English (screens/, #HijriCalendar; ADR 0048). */
export function weekStartFor(locale: Locale): number {
  return locale === 'ar' ? 6 : 0;
}

export type HijriCell = {
  /** The Gregorian day (local, noon). */
  gregorian: Date;
  /** The adjusted Hijri date shown for it. Null only when the calendar is unavailable, which the caller hides. */
  hijri: HijriDate;
  /** False for the dimmed neighbour days at the edges of the grid. */
  inMonth: boolean;
  /** The occasions on that Hijri day (markers in the grid). */
  occasions: OccasionId[];
};

/**
 * The cells of a 7-column grid for one month: leading and trailing neighbour days fill the weeks, so every row is
 * whole. Neighbour days are shown dimmed (the frame's grey edge days).
 */
export function monthCells(month: HijriMonth, adjustDays: number, locale: Locale): HijriCell[] {
  const first = month.days[0];
  if (!first) {
    return [];
  }
  const weekStart = weekStartFor(locale);
  const lead = (first.gregorian.getDay() - weekStart + 7) % 7;
  const cells: HijriCell[] = [];
  for (let back = lead; back >= 1; back -= 1) {
    const gregorian = shiftLocalDay(first.gregorian, -back);
    const hijri = toHijri(gregorian, adjustDays);
    if (!hijri) {
      return [];
    }
    cells.push({ gregorian, hijri, inMonth: false, occasions: occasionsOnDay(hijri) });
  }
  for (const day of month.days) {
    cells.push({ gregorian: day.gregorian, hijri: day.hijri, inMonth: true, occasions: occasionsOnDay(day.hijri) });
  }
  let trailing = 1;
  while (cells.length % 7 !== 0) {
    const gregorian = shiftLocalDay(month.days[month.days.length - 1]!.gregorian, trailing);
    const hijri = toHijri(gregorian, adjustDays);
    if (!hijri) {
      return [];
    }
    cells.push({ gregorian, hijri, inMonth: false, occasions: occasionsOnDay(hijri) });
    trailing += 1;
  }
  return cells;
}

/** Narrow weekday letters in week order, from the platform's own names (no hand-typed letters). */
export function weekdayLabels(locale: Locale): string[] {
  const start = weekStartFor(locale);
  // 2024-01-07 is a Sunday; the offset walks from the week's first day.
  const formatter = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : 'en', { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = (start + index) % 7;
    return formatter.format(new Date(2024, 0, 7 + dayOffset, 12));
  });
}

/** Whole days from one local day to another (DST-safe: both are taken at noon). */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

export type OccasionItem = {
  /** 'whiteDays' groups the three white days of one month into one row. */
  id: OccasionId | 'whiteDays';
  start: OccasionOccurrence;
  /** The last day of the item (the same as `start` for a single day). */
  end: OccasionOccurrence;
};

/** Groups 13, 14 and 15 of the same Hijri month into one white-days item; keeps the other occasions as they are. */
export function groupOccasions(occurrences: OccasionOccurrence[]): OccasionItem[] {
  const items: OccasionItem[] = [];
  for (let index = 0; index < occurrences.length; index += 1) {
    const current = occurrences[index]!;
    const next = occurrences[index + 1];
    const last = occurrences[index + 2];
    const isWhiteStart =
      current.id === 'whiteDay13' &&
      next?.id === 'whiteDay14' &&
      last?.id === 'whiteDay15' &&
      next.hijri.month === current.hijri.month &&
      last.hijri.month === current.hijri.month;
    if (isWhiteStart) {
      items.push({ id: 'whiteDays', start: current, end: last });
      index += 2;
    } else {
      items.push({ id: current.id, start: current, end: current });
    }
  }
  return items;
}
