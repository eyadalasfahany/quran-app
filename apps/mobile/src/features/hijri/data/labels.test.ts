import { groupOccasions } from './grid';
import { formatDayNumber, formatGregorianDay, formatHijriMonthYear, formatOccasionRange, occasionDaysAway } from './labels';
import { upcomingOccasions } from './occasions';

describe('Hijri labels', () => {
  it('formats Gregorian days in each locale, Arabic digits in Arabic', () => {
    const day = new Date(2027, 1, 8, 12);

    expect(formatGregorianDay(day, 'en')).toBe('February 8');
    expect(formatGregorianDay(day, 'ar')).toContain('٨');
    expect(formatGregorianDay(day, 'ar')).not.toMatch(/\d/);
  });

  it('formats the Hijri month and year without the era suffix', () => {
    const text = formatHijriMonthYear(new Date(2026, 9, 31, 12), 'en', 0);

    expect(text).toContain('Jumada');
    expect(text).toContain('1448');
    expect(text).not.toContain('AH');
    expect(formatHijriMonthYear(new Date(2026, 9, 31, 12), 'ar', 0)).toContain('١٤٤٨');
  });

  it('follows the adjustment for the month name', () => {
    // 31 Oct 2026 is 20 Jumada I; +2 gives 22 Jumada I, still the same month.
    expect(formatHijriMonthYear(new Date(2026, 9, 31, 12), 'en', 2)).toContain('Jumada');
  });

  it('formats a day number in the locale digits', () => {
    expect(formatDayNumber(15, 'ar')).toBe('١٥');
    expect(formatDayNumber(15, 'en')).toBe('15');
  });

  it('formats a single occasion with the Hijri date and the Gregorian day', () => {
    const [ramadan] = groupOccasions(upcomingOccasions(new Date(2027, 0, 1, 12), 0, 40)).filter((item) => item.id === 'ramadan1');
    const text = formatOccasionRange(ramadan!, 'en', 0);

    expect(text).toContain('Ramadan');
    expect(text).toContain('February 8');
  });

  it('formats the white days as a range with the Gregorian ends', () => {
    const white = groupOccasions(upcomingOccasions(new Date(2026, 9, 1, 12), 0, 30)).find((item) => item.id === 'whiteDays');
    const en = formatOccasionRange(white!, 'en', 0);
    const ar = formatOccasionRange(white!, 'ar', 0);

    expect(en).toMatch(/^13–15 /);
    expect(ar).toMatch(/^١٣–١٥ /);
    expect(ar).not.toMatch(/\d/);
  });

  it('counts the days away, zero for today', () => {
    const today = new Date(2026, 9, 31, 12);
    const occurrence = { id: 'ramadan1' as const, gregorian: today, hijri: { year: 1448, month: 5, day: 20 } };
    const item = { id: 'ramadan1' as const, start: occurrence, end: occurrence };

    expect(occasionDaysAway(item, new Date(2026, 9, 31, 9))).toBe(0);
    expect(occasionDaysAway(item, new Date(2026, 9, 27, 9))).toBe(4);
    expect(occasionDaysAway(item, new Date(2026, 10, 2, 9))).toBe(0);
  });
});
