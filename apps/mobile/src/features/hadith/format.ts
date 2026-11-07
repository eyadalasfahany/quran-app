import type { Locale } from '@/core/i18n';
import { formatNumber } from '@/core/i18n';
import { arabizeDigits } from '@/core/i18n/numbers';

const BYTES_PER_MEGABYTE = 1048576;
// U+066B ARABIC DECIMAL SEPARATOR.
const ARABIC_DECIMAL_SEPARATOR = '٫';

/** Hadith and book numbers are text ('3.1', '2787.2', '12a'). Arabic: digits become Arabic-Indic and a '.' becomes '٫' (U+066B). English: unchanged. Never parses to a number. */
export function formatHadithNumber(value: string, locale: Locale): string {
  if (locale !== 'ar') {
    return value;
  }
  return arabizeDigits(value).replace(/\./g, ARABIC_DECIMAL_SEPARATOR);
}

/** Pack size in megabytes with one decimal: bytes / 1048576, rounded to 0.1, never below 0.1 for a positive size. Arabic digits in Arabic. Returns the number text only ('9.8' or '٩٫٨'); the unit is the i18n key `ui.download.size`. */
export function formatPackSizeMb(bytes: number, locale: Locale): string {
  const rounded = Math.round((bytes / BYTES_PER_MEGABYTE) * 10) / 10;
  const megabytes = bytes > 0 && rounded < 0.1 ? 0.1 : rounded;
  return formatNumber(megabytes, locale);
}
