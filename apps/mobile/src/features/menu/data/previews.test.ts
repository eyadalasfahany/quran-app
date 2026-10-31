import type { TFunction } from 'i18next';

import { i18n } from '@/core/i18n';
import type { Locale } from '@/core/i18n/locale';

import { minutesUntil, prayerClock, remainingLabel, splitRemaining } from './previews';

async function tFor(locale: Locale): Promise<TFunction> {
  await i18n.changeLanguage(locale);
  return i18n.getFixedT(locale);
}

describe('splitRemaining', () => {
  it.each([
    [0, 0, 0],
    [59, 0, 59],
    [60, 1, 0],
    [61, 1, 1],
    [120, 2, 0],
    [822, 13, 42],
    [1439, 23, 59],
  ])('splits %i minutes into %i hours and %i minutes', (total, hours, minutes) => {
    expect(splitRemaining(total)).toEqual({ hours, minutes });
  });

  it('never goes negative or fractional', () => {
    expect(splitRemaining(-5)).toEqual({ hours: 0, minutes: 0 });
    expect(splitRemaining(61.9)).toEqual({ hours: 1, minutes: 1 });
  });
});

describe('minutesUntil', () => {
  it('rounds a partial minute up and never goes below zero', () => {
    const now = new Date('2026-11-01T10:00:00Z');
    expect(minutesUntil(new Date('2026-11-01T10:00:30Z'), now)).toBe(1);
    expect(minutesUntil(new Date('2026-11-01T10:45:00Z'), now)).toBe(45);
    expect(minutesUntil(new Date('2026-11-01T09:00:00Z'), now)).toBe(0);
  });
});

describe('prayerClock', () => {
  it('keeps the period marker in Arabic with Arabic-Indic digits', () => {
    const afternoon = new Date(2026, 10, 1, 15, 15);
    expect(prayerClock(afternoon, 'ar')).toMatch(/^[٠-٩]+:[٠-٩]{2} /);
    expect(prayerClock(afternoon, 'en')).toBe('3:15 PM');
  });
});

describe('remainingLabel, Arabic', () => {
  it.each([
    [0, 'بعد أقل من دقيقة'],
    [1, 'بعد دقيقة'],
    [2, 'بعد دقيقتين'],
    [5, 'بعد ٥ دقائق'],
    [45, 'بعد ٤٥ دقيقة'],
    [60, 'بعد ساعة'],
    [61, 'بعد ساعة ودقيقة'],
    [122, 'بعد ساعتين ودقيقتين'],
    [180, 'بعد ٣ ساعات'],
    [822, 'بعد ١٣ ساعة و٤٢ دقيقة'],
  ])('reads %i minutes as «%s»', async (minutes, expected) => {
    expect(remainingLabel(minutes, 'ar', await tFor('ar'))).toBe(expected);
  });

  it('writes the numbers in Arabic-Indic digits', async () => {
    const label = remainingLabel(822, 'ar', await tFor('ar'));
    expect(label).not.toMatch(/[0-9]/);
    expect(label).toMatch(/[٠-٩]/);
  });
});

describe('remainingLabel, English', () => {
  it.each([
    [0, 'in 0 minutes'],
    [1, 'in 1 minute'],
    [2, 'in 2 minutes'],
    [5, 'in 5 minutes'],
    [45, 'in 45 minutes'],
    [60, 'in 1 hour'],
    [61, 'in 1 hour 1 minute'],
    [122, 'in 2 hours 2 minutes'],
    [180, 'in 3 hours'],
    [822, 'in 13 hours 42 minutes'],
  ])('reads %i minutes as "%s"', async (minutes, expected) => {
    expect(remainingLabel(minutes, 'en', await tFor('en'))).toBe(expected);
  });
});
