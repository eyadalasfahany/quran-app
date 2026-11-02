import {
  clampAdjustDays,
  isHijriCalendarAvailable,
  resetHijriFormatterForTests,
  shiftLocalDay,
  toHijri,
} from './hijri-date';

const OCT_31_2026 = new Date(2026, 9, 31, 12, 0, 0, 0);

describe('toHijri', () => {
  afterEach(() => {
    resetHijriFormatterForTests();
    jest.restoreAllMocks();
  });

  it('converts a Gregorian day to the Umm al-Qura Hijri day', () => {
    expect(toHijri(OCT_31_2026, 0)).toEqual({ year: 1448, month: 5, day: 20 });
  });

  it('shifts the Gregorian day before converting: +1 shows the next day', () => {
    expect(toHijri(OCT_31_2026, 1)).toEqual(toHijri(new Date(2026, 10, 1, 12), 0));
    expect(toHijri(OCT_31_2026, -1)).toEqual(toHijri(new Date(2026, 9, 30, 12), 0));
  });

  it('clamps the adjustment to −2…+2', () => {
    expect(toHijri(OCT_31_2026, 5)).toEqual(toHijri(OCT_31_2026, 2));
    expect(toHijri(OCT_31_2026, -9)).toEqual(toHijri(OCT_31_2026, -2));
    expect(clampAdjustDays(2.6)).toBe(2);
    expect(clampAdjustDays(Number.NaN)).toBe(0);
  });

  it('crosses a year end with the adjustment', () => {
    // 1 Muharram 1449 is 6 June 2027 (Umm al-Qura): the day before is still Dhul Hijjah 1448.
    const dayBefore = new Date(2027, 5, 5, 12, 0, 0, 0);

    expect(toHijri(dayBefore, 0)).toEqual({ year: 1448, month: 12, day: 30 });
    expect(toHijri(dayBefore, 1)).toEqual({ year: 1449, month: 1, day: 1 });
  });

  it('keeps noon through a DST day in either direction', () => {
    const before = new Date(2026, 2, 28, 12, 0, 0, 0);
    const next = shiftLocalDay(before, 1);

    expect(next.getHours()).toBe(12);
    expect(next.getDate()).toBe(29);
    expect(shiftLocalDay(before, -1).getHours()).toBe(12);
  });

  it('returns null when the engine ignores the Umm al-Qura calendar', () => {
    resetHijriFormatterForTests();
    jest.spyOn(Intl, 'DateTimeFormat').mockImplementationOnce(
      () =>
        ({
          resolvedOptions: () => ({ calendar: 'gregory' }),
          formatToParts: () => [],
        }) as unknown as Intl.DateTimeFormat,
    );
    expect(toHijri(OCT_31_2026, 0)).toBeNull();
    expect(isHijriCalendarAvailable()).toBe(false);
    resetHijriFormatterForTests();
  });

  it('reports the calendar available on this engine', () => {
    expect(isHijriCalendarAvailable()).toBe(true);
  });
});
