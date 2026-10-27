import { cardinalCategory, installPluralRules } from './plural-rules';

describe('plural rules', () => {
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'two'],
    [3, 'few'],
    [7, 'few'],
    [10, 'few'],
    [11, 'many'],
    [99, 'many'],
    [100, 'other'],
    [103, 'few'],
    [200, 'other'],
    [286, 'many'],
  ] as const)('gives Arabic %i the CLDR form %s', (value, category) => {
    expect(cardinalCategory('ar', value)).toBe(category);
  });

  it('gives English one and other', () => {
    expect(cardinalCategory('en', 1)).toBe('one');
    expect(cardinalCategory('en', 7)).toBe('other');
  });

  it('matches the engine where the engine has PluralRules', () => {
    for (const value of [0, 1, 2, 7, 11, 100, 286]) {
      expect(cardinalCategory('ar', value)).toBe(new Intl.PluralRules('ar').select(value));
    }
  });

  it('fills in Intl.PluralRules only when the engine lacks it', () => {
    const original = Intl.PluralRules;
    try {
      (Intl as { PluralRules?: unknown }).PluralRules = undefined;
      installPluralRules();
      expect(new Intl.PluralRules('ar').select(7)).toBe('few');
      expect(new Intl.PluralRules('ar').resolvedOptions().pluralCategories).toContain('many');
    } finally {
      (Intl as { PluralRules: unknown }).PluralRules = original;
    }
    installPluralRules();
    expect(Intl.PluralRules).toBe(original);
  });
});
