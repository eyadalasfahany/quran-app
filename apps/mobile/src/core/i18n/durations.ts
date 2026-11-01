import type { TFunction } from 'i18next';

import { formatNumber } from './numbers';
import type { Locale } from './locale';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;

/** Whole minutes from `now` until `target`, rounded up, never negative. */
export function minutesUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / MINUTE_MS));
}

/** A countdown in minutes split into whole hours and the minutes left over (0 to 59). */
export function splitRemaining(totalMinutes: number): { hours: number; minutes: number } {
  const total = Math.max(0, Math.floor(totalMinutes));
  return { hours: Math.floor(total / MINUTES_PER_HOUR), minutes: total % MINUTES_PER_HOUR };
}

/**
 * «بعد ٤٥ دقيقة» under an hour, «بعد ١٣ ساعة و٤٢ دقيقة» and «بعد ٣ ساعات» from an hour on. Hours and minutes each
 * pick their plural form from their own count; minutes of zero drop out. Shared by the menu and Home (ADR 0034 §6).
 */
export function remainingLabel(totalMinutes: number, locale: Locale, t: TFunction): string {
  if (totalMinutes < MINUTES_PER_HOUR) {
    return t('time.remaining.inMinutes', { count: totalMinutes, minutes: formatNumber(totalMinutes, locale) });
  }
  const { hours, minutes } = splitRemaining(totalMinutes);
  const hoursText = t('time.remaining.hoursPart', { count: hours, formatted: formatNumber(hours, locale) });
  if (minutes === 0) {
    return t('time.remaining.remainingHours', { hours: hoursText });
  }
  const minutesText = t('time.remaining.minutesPart', { count: minutes, formatted: formatNumber(minutes, locale) });
  return t('time.remaining.remainingHoursMinutes', { hours: hoursText, minutes: minutesText });
}
