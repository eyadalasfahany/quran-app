import { formatDate } from './dates';

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
