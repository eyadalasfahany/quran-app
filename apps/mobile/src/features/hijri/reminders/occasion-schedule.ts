import { clockTrigger, type ClockTrigger } from '@/features/azkar/reminders/schedule';

import { shiftLocalDay, toHijri } from '../data/hijri-date';
import { OCCASION_RULES, type OccasionId } from '../data/occasions';

/**
 * The six annual Hijri occasions that may get a reminder (ADR 0048 decision 8). White days are excluded from the
 * notification budget.
 */
export const HIJRI_REMINDER_OCCASION_IDS = [
  'muharram1',
  'muharram10',
  'ramadan1',
  'shawwal1',
  'dhulHijjah9',
  'dhulHijjah10',
] as const satisfies readonly OccasionId[];

export type HijriReminderOccasionId = (typeof HIJRI_REMINDER_OCCASION_IDS)[number];

const REMINDER_RULES = OCCASION_RULES.filter((rule): rule is { id: HijriReminderOccasionId; month: number; day: number } =>
  (HIJRI_REMINDER_OCCASION_IDS as readonly string[]).includes(rule.id),
);

const SCAN_DAYS = 400;

function ruleFor(id: HijriReminderOccasionId) {
  const rule = REMINDER_RULES.find((entry) => entry.id === id);
  if (!rule) {
    throw new Error(`Unknown Hijri reminder occasion: ${id}`);
  }
  return rule;
}

/** Local fire time on a Gregorian day at the user's chosen clock time. */
export function fireAtLocal(clock: ClockTrigger, gregorianDay: Date): Date {
  return new Date(gregorianDay.getFullYear(), gregorianDay.getMonth(), gregorianDay.getDate(), clock.hour, clock.minute, 0, 0);
}

/**
 * The next local fire date for one annual occasion: the next Gregorian day that matches the adjusted Hijri date, at
 * `clockTime`. Null when the calendar is unavailable, the clock is unset, or no occurrence falls in the scan window.
 * When `from` is already on or after that instant, the following year's occurrence is used.
 */
export function nextOccasionFireDate(
  occasionId: HijriReminderOccasionId,
  from: Date,
  clockTime: string | null,
  adjustDays: number,
): Date | null {
  const clock = clockTrigger(clockTime);
  if (clock === null) {
    return null;
  }

  const rule = ruleFor(occasionId);
  const start = shiftLocalDay(from, 0);

  for (let offset = 0; offset < SCAN_DAYS; offset += 1) {
    const gregorian = shiftLocalDay(start, offset);
    const hijri = toHijri(gregorian, adjustDays);
    if (hijri === null) {
      return null;
    }
    if (hijri.month !== rule.month || hijri.day !== rule.day) {
      continue;
    }
    const fire = fireAtLocal(clock, gregorian);
    if (fire.getTime() > from.getTime()) {
      return fire;
    }
  }

  return null;
}

/** One entry per enabled annual occasion, sorted soonest first. Skips occasions with no computable fire date. */
export function upcomingOccasionFireDates(
  enabledIds: readonly HijriReminderOccasionId[],
  from: Date,
  clockTime: string | null,
  adjustDays: number,
): { id: HijriReminderOccasionId; fireAt: Date }[] {
  const rows = enabledIds
    .map((id) => {
      const fireAt = nextOccasionFireDate(id, from, clockTime, adjustDays);
      return fireAt === null ? null : { id, fireAt };
    })
    .filter((row): row is { id: HijriReminderOccasionId; fireAt: Date } => row !== null);

  return rows.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
