import { getLocale, type Locale } from './locale';

const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
// U+066B ARABIC DECIMAL SEPARATOR.
const arabicDecimalSeparator = '٫';

/** Western digits become Arabic-Indic (٢٥٥), the app's Arabic numeral style. Other characters, such as a dot in date text, stay. */
export function arabizeDigits(text: string): string {
  return text.replace(/\d/g, (digit) => arabicIndicDigits[Number(digit)] ?? digit);
}

export function formatNumber(value: number, locale: Locale = getLocale()): string {
  const text = String(value);
  if (locale !== 'ar') {
    return text;
  }
  // The decimal separator applies to the number only, never to other text that passes through arabizeDigits.
  const [whole = '', fraction] = text.split('.');
  const arabicWhole = arabizeDigits(whole);
  return fraction === undefined ? arabicWhole : `${arabicWhole}${arabicDecimalSeparator}${arabizeDigits(fraction)}`;
}

// U+066A ARABIC PERCENT SIGN in Arabic; the Latin sign follows the number in English.
const arabicPercentSign = '٪';

/** «٥٠٪» in Arabic, "50%" in English. The sign is part of the locale, so callers never choose it. */
export function formatPercent(value: number, locale: Locale = getLocale()): string {
  return `${formatNumber(value, locale)}${locale === 'ar' ? arabicPercentSign : '%'}`;
}
