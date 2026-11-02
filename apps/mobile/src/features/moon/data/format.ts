import type { TFunction } from 'i18next';

import { formatHijriDate, formatTime } from '@/core/i18n/dates';
import type { Locale } from '@/core/i18n/locale';
import { arabizeDigits, formatNumber, formatPercent } from '@/core/i18n/numbers';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** One decimal with the locale's decimal separator («٧٫٨» in Arabic, "7.8" in English). */
function formatOneDecimal(value: number, locale: Locale): string {
  return formatNumber(Math.round(value * 10) / 10, locale);
}

/** Signed degrees for display (one decimal). */
export function formatSignedDegrees(value: number, locale: Locale): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${formatOneDecimal(Math.abs(rounded), locale)}°`;
}

/** Illumination with one decimal, as the frames show it («٠٫٣٪» / "0.3%"). */
export function formatIlluminationPercent(fraction: number, locale: Locale): string {
  return formatPercent(Math.round(fraction * 1000) / 10, locale);
}

/** Odeh V for display (one decimal, signed, no degree sign: «−٧٫٨» / "−7.8"). */
export function formatOdehV(v: number, locale: Locale): string {
  return formatSignedDegrees(v, locale).replace('°', '');
}

/** «٩ نوفمبر» / "Nov 9": the Gregorian day, without the year. */
export function formatMoonDay(at: Date, locale: Locale): string {
  const text =
    locale === 'ar'
      ? new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'long' }).format(at)
      : new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(at);
  // ICU numbering for `ar` varies by platform; the app's Arabic numeral style is Arabic-Indic.
  return locale === 'ar' ? arabizeDigits(text.replace(/[‎‏؜]/g, '').trim()) : text;
}

/** «٩ نوفمبر · ١٠:٠٢ ص» / "Nov 9 · 10:02 AM": a moment in the device time zone, with its day. */
export function formatConjunctionValue(at: Date, locale: Locale, t: TFunction): string {
  return t('moon.conjunctionValue', { day: formatMoonDay(at, locale), time: formatTime(at, locale) });
}

/** «مساء ٢٩ جمادى الأولى ١٤٤٨ · ٩ نوفمبر» / "Evening of Jumada I 29, 1448 · Nov 9", for the evening's civil day. */
export function formatEveningLabel(civilDay: Date, adjustDays: number, locale: Locale, t: TFunction): string {
  return t('moon.evening', {
    hijri: formatHijriDate(civilDay, locale, adjustDays),
    day: formatMoonDay(civilDay, locale),
  });
}

/** «٧ ساعات و٣٨ دقيقة» / "7 h 38 min": an age in whole minutes. Hours and minutes each pick their plural form. */
export function formatMoonAge(ms: number, locale: Locale, t: TFunction): string {
  const totalMinutes = Math.max(0, Math.floor(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const minutesText = t('moon.age.minutes', { count: minutes, formatted: formatNumber(minutes, locale) });
  if (hours === 0) {
    return minutesText;
  }
  const hoursText = t('moon.age.hours', { count: hours, formatted: formatNumber(hours, locale) });
  if (minutes === 0) {
    return hoursText;
  }
  return t('moon.age.hoursMinutes', { hours: hoursText, minutes: minutesText });
}

/** «قبلها بـ ٦ دقائق» / "6 min before", «بعدها بـ …» / "… min after", or «في الوقت نفسه» within the same minute. */
export function formatMoonsetCompared(diffMs: number, locale: Locale, t: TFunction): string {
  const minutes = Math.round(diffMs / MINUTE_MS);
  if (minutes === 0) {
    return t('moon.compare.same');
  }
  const count = Math.abs(minutes);
  const formatted = formatNumber(count, locale);
  return minutes < 0
    ? t('moon.compare.before', { count, formatted })
    : t('moon.compare.after', { count, formatted });
}

/**
 * A span as one count in its largest sensible unit: minutes under an hour, hours under two days, then days.
 * Used after «خلال» and «قبل», so the Arabic forms are the accusative and genitive ones.
 */
export function formatSpan(ms: number, locale: Locale, t: TFunction): string {
  if (ms < HOUR_MS) {
    const minutes = Math.max(1, Math.round(ms / MINUTE_MS));
    return t('moon.span.minutes', { count: minutes, formatted: formatNumber(minutes, locale) });
  }
  if (ms < 2 * DAY_MS) {
    const hours = Math.round(ms / HOUR_MS);
    return t('moon.span.hours', { count: hours, formatted: formatNumber(hours, locale) });
  }
  const days = Math.round(ms / DAY_MS);
  return t('moon.span.days', { count: days, formatted: formatNumber(days, locale) });
}

/**
 * «الاقتران خلال ٧ ساعات» / "Conjunction in 7 hours", or «الاقتران قبل ٧ ساعات» / "Conjunction 7 hours ago": the
 * nearer of the previous and the next conjunction to `now`.
 */
export function formatConjunctionPreview(
  now: Date,
  previous: Date,
  next: Date,
  locale: Locale,
  t: TFunction,
): string {
  const sincePrevious = now.getTime() - previous.getTime();
  const untilNext = next.getTime() - now.getTime();
  if (sincePrevious <= untilNext) {
    return t('moon.menu.conjunctionAgo', { duration: formatSpan(sincePrevious, locale, t) });
  }
  return t('moon.menu.conjunctionIn', { duration: formatSpan(untilNext, locale, t) });
}
