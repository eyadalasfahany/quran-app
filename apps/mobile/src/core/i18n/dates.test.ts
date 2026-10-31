import { formatDate, formatHijriDate, formatTime } from './dates';

// 2026-10-28T12:00:00Z
const WHEN = 1_793_205_600_000;

describe('formatDate', () => {
  it('formats Arabic dates with month name and Arabic-Indic digits', () => {
    const text = formatDate(WHEN, 'ar');

    expect(text).toContain('٢٠٢٦');
    expect(text).toContain('٢٨');
    expect(text).toContain('أكتوبر');
  });

  it('formats English dates', () => {
    const text = formatDate(WHEN, 'en');

    expect(text).toContain('2026');
    expect(text).toContain('28');
    expect(text).toContain('October');
  });

  it('defaults to the app locale', () => {
    expect(formatDate(WHEN)).toBe(formatDate(WHEN, 'ar'));
  });
});

describe('formatHijriDate', () => {
  // Local noon on 2026-10-31 — Umm al-Qura: 20 Jumada al-Ula 1448.
  const DAY = new Date(2026, 9, 31, 12, 0, 0, 0);

  it('formats the Umm al-Qura Hijri date in Arabic without the era suffix', () => {
    const text = formatHijriDate(DAY, 'ar');

    expect(text).toBe('٢٠ جمادى الأولى ١٤٤٨');
  });

  it('formats the Hijri date in English without the AH suffix', () => {
    const text = formatHijriDate(DAY, 'en');

    expect(text).toContain('Jumada');
    expect(text).toContain('1448');
    expect(text).not.toContain('AH');
  });

  it('defaults to the app locale', () => {
    expect(formatHijriDate(DAY)).toBe(formatHijriDate(DAY, 'ar'));
  });
});

describe('formatTime', () => {
  // 21:00 local time.
  const NINE_PM = new Date(2026, 9, 30, 21, 0, 0, 0);

  it('formats Arabic times with Arabic-Indic digits and the م marker', () => {
    const text = formatTime(NINE_PM, 'ar');

    expect(text).toContain('٩');
    expect(text).toContain('م');
  });

  it('formats English times', () => {
    expect(formatTime(NINE_PM, 'en')).toBe('9:00 PM');
  });

  it('defaults to the app locale', () => {
    expect(formatTime(NINE_PM)).toBe(formatTime(NINE_PM, 'ar'));
  });
});
