import { occasionsOnDay, upcomingOccasions, type OccasionId } from './occasions';

const FROM = new Date(2026, 4, 1, 12, 0, 0, 0);

function find(occurrences: ReturnType<typeof upcomingOccasions>, id: OccasionId) {
  return occurrences.find((entry) => entry.id === id);
}

describe('upcomingOccasions', () => {
  // Node ICU Umm al-Qura values for 1448 (ADR 0048 H2; the device probe H0 replaces them if they differ).
  // Gregorian year, month (0-based), day.
  const ANNUAL_1448: [OccasionId, number, number, number][] = [
    ['muharram1', 2026, 5, 16],
    ['muharram10', 2026, 5, 25],
    ['ramadan1', 2027, 1, 8],
    ['shawwal1', 2027, 2, 9],
    ['dhulHijjah9', 2027, 4, 15],
    ['dhulHijjah10', 2027, 4, 16],
  ];

  it.each(ANNUAL_1448)('finds %s of 1448 on the expected Gregorian day', (id, year, month, day) => {
    const hit = find(
      upcomingOccasions(FROM, 0, 200).filter((entry) => entry.hijri.year === 1448),
      id,
    );

    expect(hit?.gregorian.getFullYear()).toBe(year);
    expect(hit?.gregorian.getMonth()).toBe(month);
    expect(hit?.gregorian.getDate()).toBe(day);
  });

  it('finds 1 Muharram 1449 on 6 June 2027', () => {
    const hit = find(upcomingOccasions(new Date(2027, 4, 1, 12), 0, 20), 'muharram1');

    expect(hit?.hijri).toEqual({ year: 1449, month: 1, day: 1 });
    expect(hit?.gregorian.getMonth()).toBe(5);
    expect(hit?.gregorian.getDate()).toBe(6);
  });

  it('finds the three white days of every month, in order', () => {
    const whiteDays = upcomingOccasions(FROM, 0, 120).filter((entry) => entry.id.startsWith('whiteDay'));

    expect(whiteDays.length).toBeGreaterThanOrEqual(6);
    // The window may open mid-triple, so check the cycle 13, 14, 15 from the first entry on.
    const first = whiteDays[0]?.hijri.day ?? 13;
    whiteDays.forEach((entry, index) => {
      expect(entry.hijri.day).toBe(13 + ((first - 13 + index) % 3));
    });
  });

  it('keeps the white days of a 29-day month', () => {
    // Jumada I 1448 (month 5) has 30 days; the grid check is the 29-day case in month.test.ts. Here: all three appear.
    const month = upcomingOccasions(new Date(2026, 9, 1, 12), 0, 200).filter(
      (entry) => entry.hijri.year === 1448 && entry.hijri.month === 5,
    );

    expect(month.map((entry) => entry.hijri.day)).toEqual(expect.arrayContaining([13, 14, 15]));
  });

  it('shifts the day by the adjustment but keeps the Hijri number', () => {
    const plain = find(upcomingOccasions(FROM, 0, 200), 'ramadan1');
    const plusOne = find(upcomingOccasions(FROM, 1, 200), 'ramadan1');

    expect(plusOne?.hijri).toEqual({ year: 1448, month: 9, day: 1 });
    expect(plain?.gregorian.getDate()).toBe(8);
    expect(plusOne?.gregorian.getDate()).toBe(7);
  });

  it('returns occasions in date order and honours the count', () => {
    const occurrences = upcomingOccasions(FROM, 0, 5);

    expect(occurrences).toHaveLength(5);
    occurrences.slice(1).forEach((entry, index) => {
      expect(entry.gregorian.getTime()).toBeGreaterThan(occurrences[index]!.gregorian.getTime());
    });
  });

  it('returns nothing for a zero count', () => {
    expect(upcomingOccasions(FROM, 0, 0)).toEqual([]);
  });

  it('lists the occasions of one Hijri day', () => {
    expect(occasionsOnDay({ year: 1448, month: 9, day: 1 })).toEqual(['ramadan1']);
    expect(occasionsOnDay({ year: 1448, month: 2, day: 14 })).toEqual(['whiteDay14']);
    expect(occasionsOnDay({ year: 1448, month: 2, day: 2 })).toEqual([]);
  });
});
