// Hermes on iOS ships no Intl.PluralRules, and without it i18next only ever picks the `_other` form,
// so Arabic reads «٧ آية» instead of «٧ آيات». This fills the gap for the app's two languages with the
// CLDR cardinal rules. Where the engine has Intl.PluralRules, it is left alone.

type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

export function cardinalCategory(locale: string, value: number): PluralCategory {
  const n = Math.abs(value);
  if (locale.startsWith('ar')) {
    const mod100 = n % 100;
    if (n === 0) return 'zero';
    if (n === 1) return 'one';
    if (n === 2) return 'two';
    if (Number.isInteger(n) && mod100 >= 3 && mod100 <= 10) return 'few';
    if (Number.isInteger(n) && mod100 >= 11 && mod100 <= 99) return 'many';
    return 'other';
  }
  return n === 1 ? 'one' : 'other';
}

const CATEGORIES: Record<'ar' | 'en', PluralCategory[]> = {
  ar: ['zero', 'one', 'two', 'few', 'many', 'other'],
  en: ['one', 'other'],
};

class AppPluralRules {
  private readonly locale: 'ar' | 'en';

  constructor(locales?: string | string[]) {
    const first = Array.isArray(locales) ? locales[0] : locales;
    this.locale = first?.startsWith('ar') ? 'ar' : 'en';
  }

  static supportedLocalesOf(locales: string | string[]): string[] {
    return (Array.isArray(locales) ? locales : [locales]).filter((locale) => /^(ar|en)\b/.test(locale));
  }

  select(value: number): PluralCategory {
    return cardinalCategory(this.locale, value);
  }

  resolvedOptions() {
    return { locale: this.locale, pluralCategories: CATEGORIES[this.locale], type: 'cardinal' as const };
  }
}

export function installPluralRules(): void {
  if (typeof Intl === 'object' && typeof Intl.PluralRules === 'undefined') {
    (Intl as { PluralRules: unknown }).PluralRules = AppPluralRules;
  }
}
