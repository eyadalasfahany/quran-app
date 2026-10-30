import { getLocale, type Locale } from './locale';

const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
// U+066B ARABIC DECIMAL SEPARATOR.
const arabicDecimalSeparator = '٫';

/** Western digits become Arabic-Indic (٢٥٥), the app's Arabic numeral style; the decimal separator follows. */
export function arabizeDigits(text: string): string {
  return text
    .replace(/\d/g, (digit) => arabicIndicDigits[Number(digit)] ?? digit)
    .replace('.', arabicDecimalSeparator);
}

export function formatNumber(value: number, locale: Locale = getLocale()): string {
  const text = String(value);
  if (locale !== 'ar') {
    return text;
  }
  return arabizeDigits(text);
}
