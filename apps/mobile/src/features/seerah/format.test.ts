import { i18n } from '@/core/i18n';

import { ageRangeText, ageText, eraText, eventCountText, stageName, stageRangeShort } from './format';

async function inLocale(locale: 'ar' | 'en') {
  await i18n.changeLanguage(locale);
  return i18n.t.bind(i18n);
}

describe('seerah format helpers', () => {
  it('ages in Arabic use Arabic-Indic digits', async () => {
    const t = await inLocale('ar');
    expect(ageText(t, 54)).toBe('عمره ٥٤ سنة');
    expect(ageRangeText(t, 43, 44)).toBe('عمره ٤٣–٤٤ سنة');
    expect(ageRangeText(t, 43, 43)).toBe('عمره ٤٣ سنة');
  });

  it('ages in English use Western digits', async () => {
    const t = await inLocale('en');
    expect(ageText(t, 54)).toBe('Age 54');
    expect(ageRangeText(t, 43, 44)).toBe('Age 43–44');
  });

  it.each([
    ['ar', 0, '٥٣ ق.هـ'],
    ['ar', 52, '١ ق.هـ'],
    ['ar', 53, '١ هـ'],
    ['ar', 54, '٢ هـ'],
    ['en', 54, '2 AH'],
    ['en', 40, '13 BH'],
  ] as const)('era in %s at age %i is %s', async (locale, age, expected) => {
    expect(eraText(await inLocale(locale), age)).toBe(expected);
  });

  it('has no era outside 0..63', async () => {
    expect(eraText(await inLocale('ar'), 64)).toBeNull();
  });

  it.each([
    [0, 'لا أحداث'],
    [1, 'حدث واحد'],
    [2, 'حدثان'],
    [5, '٥ أحداث'],
    [12, '١٢ حدثًا'],
    [162, '١٦٢ حدثًا'],
  ])('Arabic event count %i', async (count, expected) => {
    expect(eventCountText(await inLocale('ar'), count)).toBe(expected);
  });

  it('English event count', async () => {
    const t = await inLocale('en');
    expect(eventCountText(t, 1)).toBe('1 event');
    expect(eventCountText(t, 162)).toBe('162 events');
  });

  it('names the stage and its range', async () => {
    const t = await inLocale('ar');
    expect(stageName(t, 55)).toBe('الكهولة');
    expect(stageName(t, 99)).toBeNull();
    expect(stageRangeShort(t, 40, 63)).toBe('٤٠–٦٣');
  });
});
