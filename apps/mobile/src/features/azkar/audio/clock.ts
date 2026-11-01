import type { Locale } from '@/core/i18n/locale';
import { arabizeDigits } from '@/core/i18n/numbers';

/** Elapsed or total time as m:ss (or h:mm:ss past an hour), with the locale's digits. Negative values read as 0. */
export function formatClock(milliseconds: number, locale: Locale): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  const text =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
      : `${minutes}:${seconds}`;

  return locale === 'ar' ? arabizeDigits(text) : text;
}
