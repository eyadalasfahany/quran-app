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
