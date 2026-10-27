import { getLocale, type Locale } from './locale';

const arabicIndicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'] as const;
// U+066B ARABIC DECIMAL SEPARATOR.
const arabicDecimalSeparator = '٫';

export function formatNumber(value: number, locale: Locale = getLocale()): string {
  const text = String(value);
  if (locale !== 'ar') {
    return text;
  }
  return text
    .replace(/\d/g, (digit) => arabicIndicDigits[Number(digit)] ?? digit)
    .replace('.', arabicDecimalSeparator);
}
