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

/**
 * Elapsed or total playback time: m:ss, or h:mm:ss from one hour, with the locale's digits. Zero renders as 0:00, so the
 * labels show before a duration is known. A non-finite or negative value counts as zero.
 */
export function formatPlaybackClock(ms: number, locale: Locale): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const text = hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
  return locale === 'ar' ? arabizeDigits(text) : text;
}
