import type { TFunction } from 'i18next';

import type { Locale } from '@/core/i18n/locale';
import { arabizeDigits, formatNumber } from '@/core/i18n/numbers';

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;

const clockFormatters = new Map<Locale, Intl.DateTimeFormat>();

function clockFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = clockFormatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  clockFormatters.set(locale, created);
  return created;
}

/**
 * The menu's prayer line: «٣:١٥ م» / "3:15 PM". Unlike the Salah screen's times, the period marker stays, as the
 * Menu frame draws it.
 */
export function prayerClock(date: Date, locale: Locale): string {
  const text = clockFormatter(locale).format(date);
  return locale === 'ar' ? arabizeDigits(text) : text;
}

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
 * pick their plural form from their own count; minutes of zero drop out.
 */
export function remainingLabel(totalMinutes: number, locale: Locale, t: TFunction): string {
  if (totalMinutes < MINUTES_PER_HOUR) {
    return t('menu.salah.inMinutes', { count: totalMinutes, minutes: formatNumber(totalMinutes, locale) });
  }
  const { hours, minutes } = splitRemaining(totalMinutes);
  const hoursText = t('menu.salah.hoursPart', { count: hours, formatted: formatNumber(hours, locale) });
  if (minutes === 0) {
    return t('menu.salah.remainingHours', { hours: hoursText });
  }
  const minutesText = t('menu.salah.minutesPart', { count: minutes, formatted: formatNumber(minutes, locale) });
  return t('menu.salah.remainingHoursMinutes', { hours: hoursText, minutes: minutesText });
}
