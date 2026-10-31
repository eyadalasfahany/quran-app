import { formatPrayerTime, formatRemaining } from './time-format';

describe('formatPrayerTime', () => {
  it('formats an evening time in Arabic without the م marker, with Arabic-Indic digits', () => {
    const maghrib = new Date(2026, 9, 31, 17, 47, 0, 0);

    const text = formatPrayerTime(maghrib, 'ar');

    expect(text).toBe('٥:٤٧');
    expect(text).not.toContain('م');
  });

  it('formats a morning time in Arabic without the ص marker', () => {
    const fajr = new Date(2026, 9, 31, 5, 10, 0, 0);

    expect(formatPrayerTime(fajr, 'ar')).toBe('٥:١٠');
  });

  it('formats English times without AM/PM', () => {
    const isha = new Date(2026, 9, 31, 19, 17, 0, 0);

    const text = formatPrayerTime(isha, 'en');

    expect(text).toBe('7:17');
  });

  it('keeps two-digit minutes past midnight', () => {
    const afterMidnight = new Date(2026, 9, 31, 0, 5, 0, 0);

    expect(formatPrayerTime(afterMidnight, 'en')).toBe('12:05');
  });
});

describe('formatRemaining', () => {
  it('formats hours and minutes in Arabic-Indic digits', () => {
    expect(formatRemaining(83 * 60_000, 'ar')).toBe('١:٢٣');
  });

  it('formats English durations', () => {
    expect(formatRemaining(83 * 60_000, 'en')).toBe('1:23');
  });

  it('rounds partial minutes up so the countdown never stalls at zero', () => {
    expect(formatRemaining(61_000, 'en')).toBe('0:02');
    expect(formatRemaining(60_000, 'en')).toBe('0:01');
  });

  it('pads minutes to two digits', () => {
    expect(formatRemaining(65 * 60_000, 'en')).toBe('1:05');
  });

  it('clamps negative durations to zero', () => {
    expect(formatRemaining(-5_000, 'en')).toBe('0:00');
  });

  it('keeps hours when a day boundary pushes fajr far out', () => {
    expect(formatRemaining(9 * 3_600_000 + 45 * 60_000, 'en')).toBe('9:45');
  });
});
