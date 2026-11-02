import { formatHijriDate } from '@/core/i18n/dates';
import type { Locale } from '@/core/i18n/locale';
import { arabizeDigits } from '@/core/i18n/numbers';

import { clampAdjustDays, shiftLocalDay } from './hijri-date';
import { daysBetween, type OccasionItem } from './grid';

// Umm al-Qura month names for the Hijri month header and the occasion ranges (ADR 0048 H3).
const HIJRI_TAG: Record<Locale, string> = {
  ar: 'ar-SA-u-ca-islamic-umalqura',
  en: 'en-u-ca-islamic-umalqura',
};

function localized(text: string, locale: Locale): string {
  return locale === 'ar' ? arabizeDigits(text) : text;
}

/** «٨ فبراير» / "8 February": the Gregorian day and month. */
export function formatGregorianDay(date: Date, locale: Locale): string {
  return localized(new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date), locale);
}

/** «جمادى الأولى ١٤٤٨» / "Jumada I 1448": the Hijri month and year for the adjusted day. */
export function formatHijriMonthYear(date: Date, locale: Locale, adjustDays: number): string {
  const shifted = shiftLocalDay(date, clampAdjustDays(adjustDays));
  const text = new Intl.DateTimeFormat(HIJRI_TAG[locale], { month: 'long', year: 'numeric' })
    .format(shifted)
    .replace(/\s?(هـ|AH)$/, '')
    .trim();
  return localized(text, locale);
}

/** The Hijri day number alone, in the locale's digits. */
export function formatDayNumber(day: number, locale: Locale): string {
  return localized(String(day), locale);
}

/**
 * The second line of an occasion row. A single day: «١ رمضان ١٤٤٨ · ٨ فبراير ٢٠٢٧». The white days: «١٣–١٥ جمادى الآخرة
 * ١٤٤٨ · ٢٣–٢٥ نوفمبر» (the Gregorian end is shortened when both ends share a month, as the frame does).
 */
export function formatOccasionRange(item: OccasionItem, locale: Locale, adjustDays: number): string {
  const { start, end } = item;
  if (item.id !== 'whiteDays') {
    return `${formatHijriDate(start.gregorian, locale, adjustDays)} · ${formatGregorianDay(start.gregorian, locale)}`;
  }
  const hijri = `${formatDayNumber(start.hijri.day, locale)}–${formatDayNumber(end.hijri.day, locale)} ${formatHijriMonthYear(start.gregorian, locale, adjustDays)}`;
  const sameMonth = start.gregorian.getMonth() === end.gregorian.getMonth();
  const gregorianStart = formatDayNumber(start.gregorian.getDate(), locale);
  const gregorian = sameMonth
    ? `${gregorianStart}–${formatGregorianDay(end.gregorian, locale)}`
    : `${formatGregorianDay(start.gregorian, locale)} – ${formatGregorianDay(end.gregorian, locale)}`;
  return `${hijri} · ${gregorian}`;
}

/** Whole days from `today` to the occasion (0 when it is today). */
export function occasionDaysAway(item: OccasionItem, today: Date): number {
  return Math.max(0, daysBetween(today, item.start.gregorian));
}

/** «−٢», «٠», «+١»: the signed day count in the locale's digits. The sign is a plain character, as the frames draw it. */
export function formatSignedDays(value: number, locale: Locale): string {
  const digits = localized(String(Math.abs(value)), locale);
  if (value === 0) {
    return digits;
  }
  return `${value < 0 ? '−' : '+'}${digits}`;
}
