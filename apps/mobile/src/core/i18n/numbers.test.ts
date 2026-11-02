import { formatNumber, formatPercent } from './numbers';

describe('formatPercent', () => {
  it.each([
    [0, '٠٪'],
    [50, '٥٠٪'],
    [100, '١٠٠٪'],
  ])('writes %i in Arabic as «%s» with the Arabic percent sign', (value, expected) => {
    expect(formatPercent(value, 'ar')).toBe(expected);
  });

  it.each([
    [0, '0%'],
    [50, '50%'],
    [100, '100%'],
  ])('writes %i in English as "%s"', (value, expected) => {
    expect(formatPercent(value, 'en')).toBe(expected);
  });

  it('uses the same digits as formatNumber in each locale', () => {
    expect(formatPercent(37, 'ar')).toBe(`${formatNumber(37, 'ar')}٪`);
    expect(formatPercent(37, 'en')).toBe(`${formatNumber(37, 'en')}%`);
  });
});
