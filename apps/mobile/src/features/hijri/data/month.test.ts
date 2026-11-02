import { toHijri } from './hijri-date';
import { hijriMonth } from './month';

describe('hijriMonth', () => {
  it('round-trips every month of 1445 to 1450 against toHijri', () => {
    for (let year = 1445; year <= 1450; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const grid = hijriMonth(year, month, 0);
        expect(grid).not.toBeNull();
        if (!grid) {
          continue;
        }
        expect([29, 30]).toContain(grid.length);
        expect(grid.days[0]?.hijri).toEqual({ year, month, day: 1 });
        grid.days.forEach((entry, index) => {
          expect(entry.hijri.day).toBe(index + 1);
          expect(toHijri(entry.gregorian, 0)).toEqual(entry.hijri);
        });
      }
    }
  });

  it('finds both a 29-day and a 30-day month in 1448', () => {
    const lengths = Array.from({ length: 12 }, (_, index) => hijriMonth(1448, index + 1, 0)?.length);

    expect(lengths).toContain(29);
    expect(lengths).toContain(30);
  });

  it('starts Ramadan 1448 on 8 February 2027 (Umm al-Qura, Node ICU)', () => {
    const first = hijriMonth(1448, 9, 0)?.days[0]?.gregorian;

    expect(first?.getFullYear()).toBe(2027);
    expect(first?.getMonth()).toBe(1);
    expect(first?.getDate()).toBe(8);
  });

  it('shifts the whole month by the adjustment, keeping the Hijri numbers', () => {
    const plain = hijriMonth(1448, 9, 0);
    const plusOne = hijriMonth(1448, 9, 1);

    expect(plusOne?.length).toBe(plain?.length);
    // With +1 the first day shown is 1 Ramadan, so it falls on the Gregorian day before (7 February).
    expect(plusOne?.days[0]?.gregorian.getDate()).toBe(7);
    expect(plusOne?.days[0]?.hijri).toEqual({ year: 1448, month: 9, day: 1 });
  });
});
