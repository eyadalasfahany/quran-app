import { getLocale, type Locale } from './locale';
import { arabizeDigits } from './numbers';

const formatters = new Map<Locale, Intl.DateTimeFormat>();

function formatter(locale: Locale): Intl.DateTimeFormat {
  const cached = formatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  formatters.set(locale, created);
  return created;
}

/** «٢٨ أكتوبر ٢٠٢٦» / "October 28, 2026" — for personal-data timestamps like a note's updated date. */
export function formatDate(epochMs: number, locale: Locale = getLocale()): string {
  const text = formatter(locale).format(new Date(epochMs));
  // ICU numbering for `ar` varies by platform; the app's Arabic numeral style is Arabic-Indic.
  return locale === 'ar' ? arabizeDigits(text) : text;
}

const hijriFormatters = new Map<Locale, Intl.DateTimeFormat>();

function hijriFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = hijriFormatters.get(locale);
  if (cached) {
    return cached;
  }
  // Umm al-Qura Hijri calendar, computed on-device by ICU — no network, no drift (ADR 0030 §6).
  const tag = locale === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura';
  const created = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' });
  hijriFormatters.set(locale, created);
  return created;
}

/** The local calendar day `days` after `date`, at noon (a DST day never moves it). Clamped to the −2…+2 range (ADR 0048). */
function shiftedDay(date: Date, days: number): Date {
  const clamped = Math.min(2, Math.max(-2, Math.round(days)));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + clamped, 12, 0, 0, 0);
}

/**
 * «٢٠ جمادى الأولى ١٤٤٨» / "Jumada I 20, 1448" — Umm al-Qura Hijri date for the Salah header and the Hijri screens.
 * `adjustDays` shifts the Gregorian day first (the user's adjustment, ADR 0048); 0 leaves the date as it was.
 */
export function formatHijriDate(date: Date, locale: Locale = getLocale(), adjustDays = 0): string {
  const shown = adjustDays === 0 ? date : shiftedDay(date, adjustDays);
  const text = hijriFormatter(locale)
    .format(shown)
    .replace(/\s?(هـ|AH)$/, '')
    .trim();
  return locale === 'ar' ? arabizeDigits(text) : text;
}

const weekdayFormatters = new Map<Locale, Intl.DateTimeFormat>();

function weekdayFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = weekdayFormatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  weekdayFormatters.set(locale, created);
  return created;
}

/** «السبت ٣١ أكتوبر» / "Saturday, October 31" — the Gregorian line under the Salah header's Hijri date. */
export function formatWeekdayDate(date: Date, locale: Locale = getLocale()): string {
  const text = weekdayFormatter(locale).format(date);
  // ICU punctuates the Arabic weekday with «،»; the Salah header drops it (quran-app-screens.html, #Salah).
  return locale === 'ar' ? arabizeDigits(text).replace(/،/g, '') : text;
}

const timeFormatters = new Map<Locale, Intl.DateTimeFormat>();

function timeFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = timeFormatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' });
  timeFormatters.set(locale, created);
  return created;
}

/** «٩:٠٠ م» / "9:00 PM" — for the daily reminder time in Settings. */
export function formatTime(date: Date, locale: Locale = getLocale()): string {
  const text = timeFormatter(locale).format(date);
  return locale === 'ar' ? arabizeDigits(text) : text;
}
