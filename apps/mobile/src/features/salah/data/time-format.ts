import { getLocale, type Locale } from '../../../core/i18n/locale';
import { arabizeDigits } from '../../../core/i18n/numbers';

const prayerTimeFormatters = new Map<Locale, Intl.DateTimeFormat>();

function prayerTimeFormatter(locale: Locale): Intl.DateTimeFormat {
  const cached = prayerTimeFormatters.get(locale);
  if (cached) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: true });
  prayerTimeFormatters.set(locale, created);
  return created;
}

/**
 * «٥:٤٧» / "5:47" — 12-hour clock without the ص/م marker, the convention on prayer-time displays
 * (quran-app-screens.html, #Salah): الفجر is read as morning and المغرب as evening from context.
 */
export function formatPrayerTime(date: Date, locale: Locale = getLocale()): string {
  const text = prayerTimeFormatter(locale)
    .formatToParts(date)
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .trim();
  return locale === 'ar' ? arabizeDigits(text) : text;
}

/**
 * «١:٢٣» / "1:23" — hours and minutes until the next prayer, minutes rounded up so the
 * countdown never reads «٠:٠٠» while seconds remain.
 */
export function formatRemaining(ms: number, locale: Locale = getLocale()): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const text = `${hours}:${String(minutes).padStart(2, '0')}`;
  return locale === 'ar' ? arabizeDigits(text) : text;
}
