import { upcomingOccasions } from './occasions';
import { daysBetween, groupOccasions, monthCells, weekdayLabels, weekStartFor } from './grid';
import { hijriMonth } from './month';

describe('monthCells', () => {
  it('fills whole weeks and starts the first row on Saturday in Arabic', () => {
    const month = hijriMonth(1448, 5, 0)!;
    const cells = monthCells(month, 0, 'ar');

    expect(cells.length % 7).toBe(0);
    expect(cells[0]!.gregorian.getDay()).toBe(6);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(month.length);
  });

  it('starts the first row on Sunday in English', () => {
    const month = hijriMonth(1448, 5, 0)!;
    const cells = monthCells(month, 0, 'en');

    expect(cells[0]!.gregorian.getDay()).toBe(0);
    expect(cells.filter((cell) => cell.inMonth)).toHaveLength(month.length);
  });

  it('dims the neighbour days and marks the occasion days', () => {
    const cells = monthCells(hijriMonth(1448, 9, 0)!, 0, 'en');
    const ramadanStart = cells.find((cell) => cell.inMonth && cell.hijri.day === 1);

    expect(cells.some((cell) => !cell.inMonth)).toBe(true);
    expect(ramadanStart?.occasions).toEqual(['ramadan1']);
  });

  it('follows the adjustment in the Hijri numbers shown', () => {
    const plusOne = monthCells(hijriMonth(1448, 9, 1)!, 1, 'en');
    const first = plusOne.find((cell) => cell.inMonth);

    expect(first?.hijri).toEqual({ year: 1448, month: 9, day: 1 });
  });
});

describe('weekdayLabels', () => {
  it('returns seven narrow labels from the platform, Saturday first in Arabic', () => {
    expect(weekdayLabels('ar')).toHaveLength(7);
    expect(weekdayLabels('ar')[0]).toBe('س');
    expect(weekdayLabels('en')).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  it('exposes the week start per locale', () => {
    expect(weekStartFor('ar')).toBe(6);
    expect(weekStartFor('en')).toBe(0);
  });
});

describe('daysBetween', () => {
  it('counts whole local days across a DST change', () => {
    expect(daysBetween(new Date(2026, 2, 28, 12), new Date(2026, 3, 1, 12))).toBe(4);
    expect(daysBetween(new Date(2026, 9, 31, 9), new Date(2026, 9, 31, 22))).toBe(0);
  });
});

describe('groupOccasions', () => {
  it('groups the three white days of a month into one item', () => {
    const occurrences = upcomingOccasions(new Date(2026, 9, 1, 12), 0, 30);
    const items = groupOccasions(occurrences);
    const white = items.find((item) => item.id === 'whiteDays');

    expect(white).toBeDefined();
    expect(white!.start.hijri.day).toBe(13);
    expect(white!.end.hijri.day).toBe(15);
    expect(items.some((item) => item.id === 'whiteDay14')).toBe(false);
  });

  it('keeps single occasions and keeps their order', () => {
    const occurrences = upcomingOccasions(new Date(2026, 9, 1, 12), 0, 200);
    const items = groupOccasions(occurrences);

    expect(items.find((item) => item.id === 'ramadan1')?.start.hijri).toEqual({ year: 1448, month: 9, day: 1 });
    items.slice(1).forEach((item, index) => {
      expect(item.start.gregorian.getTime()).toBeGreaterThan(items[index]!.start.gregorian.getTime());
    });
  });
});
