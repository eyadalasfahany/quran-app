import type { Locale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n/numbers';

function formatOneDecimal(value: number, locale: Locale): string {
  const rounded = Math.round(value * 10) / 10;
  const [whole, fraction = '0'] = String(rounded).split('.');
  return fraction === '0' ? formatNumber(Number(whole), locale) : `${formatNumber(Number(whole), locale)}.${formatNumber(Number(fraction), locale)}`;
}

/** Signed degrees for display (one decimal). */
export function formatSignedDegrees(value: number, locale: Locale): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '';
  return `${sign}${formatOneDecimal(Math.abs(rounded), locale)}°`;
}

/** Moon age in days (one decimal). */
export function formatAgeDays(days: number, locale: Locale): string {
  return formatOneDecimal(days, locale);
}

/** Hours with one decimal (moon age). */
export function formatMoonAgeHours(hours: number, locale: Locale): string {
  return formatOneDecimal(hours, locale);
}

/** Illumination as a whole-number percent. */
export function formatIlluminationPercent(fraction: number, locale: Locale): string {
  const percent = Math.round(fraction * 100);
  return `${formatNumber(percent, locale)}%`;
}

/** Local time (device locale formatting). */
export function formatMoonTime(at: Date, locale: Locale): string {
  return at.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

/** Odeh V for display (one decimal, signed). */
export function formatOdehV(v: number, locale: Locale): string {
  return formatSignedDegrees(v, locale).replace('°', '');
}
