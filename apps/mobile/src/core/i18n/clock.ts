import type { Locale } from './locale';
import { arabizeDigits } from './numbers';

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
 * «٣:١٥ م» / "3:15 PM": the prayer's clock with its period marker, as the menu and Home draw it. (The Salah
 * screen's times drop the marker; see `features/salah/data/time-format.ts`.)
 */
export function prayerClock(date: Date, locale: Locale): string {
  const text = clockFormatter(locale).format(date);
  return locale === 'ar' ? arabizeDigits(text) : text;
}
