import type { TFunction } from 'i18next';

import { i18n } from '@/core/i18n';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/core/i18n/numbers';

async function tFor(locale: Locale): Promise<TFunction> {
  await i18n.changeLanguage(locale);
  return i18n.getFixedT(locale);
}

function durationText(t: TFunction, days: number, locale: Locale) {
  return t('khatma.durationDays', { count: days, formatted: formatNumber(days, locale) });
}

describe('khatma duration plurals in Arabic', () => {
  it.each([
    [1, 'يوم واحد'],
    [2, 'يومان'],
    [7, '٧ أيام'],
    [15, '١٥ يومًا'],
    [30, '٣٠ يومًا'],
    [60, '٦٠ يومًا'],
  ])('reads %i days as the Arabic plural form «%s»', async (days, expected) => {
    expect(durationText(await tFor('ar'), days, 'ar')).toBe(expected);
  });

  it.each([
    [1, 'ختمة يوم واحد'],
    [2, 'ختمة يومين'],
    [7, 'ختمة ٧ أيام'],
    [15, 'ختمة ١٥ يومًا'],
    [30, 'ختمة ٣٠ يومًا'],
    [60, 'ختمة ٦٠ يومًا'],
  ])('titles a %i-day plan «%s»', async (days, expected) => {
    const t = await tFor('ar');
    expect(t('khatma.summary.planName', { count: days, formatted: formatNumber(days, 'ar') })).toBe(expected);
  });

  it.each([
    [1, 'يوم واحد'],
    [2, 'يومان'],
    [7, '٧ أيام'],
    [15, '١٥ يومًا'],
    [30, '٣٠ يومًا'],
    [60, '٦٠ يومًا'],
  ])('shows the settings duration for %i days as «%s»', async (days, expected) => {
    const t = await tFor('ar');
    expect(t('khatma.settingsDuration', { count: days, formatted: formatNumber(days, 'ar') })).toBe(expected);
  });
});

describe('khatma duration plurals in English', () => {
  it.each([
    [1, '1 day'],
    [2, '2 days'],
    [7, '7 days'],
    [15, '15 days'],
    [30, '30 days'],
    [60, '60 days'],
  ])('reads %i days as "%s"', async (days, expected) => {
    expect(durationText(await tFor('en'), days, 'en')).toBe(expected);
  });

  it.each([
    [1, '1-day khatma'],
    [2, '2-day khatma'],
    [7, '7-day khatma'],
    [15, '15-day khatma'],
    [30, '30-day khatma'],
    [60, '60-day khatma'],
  ])('titles a %i-day plan "%s"', async (days, expected) => {
    const t = await tFor('en');
    expect(t('khatma.summary.planName', { count: days, formatted: String(days) })).toBe(expected);
  });

  it.each([
    [1, '1 day'],
    [2, '2 days'],
    [7, '7 days'],
    [15, '15 days'],
    [30, '30 days'],
    [60, '60 days'],
  ])('shows the settings duration for %i days as "%s"', async (days, expected) => {
    const t = await tFor('en');
    expect(t('khatma.settingsDuration', { count: days, formatted: String(days) })).toBe(expected);
  });
});
