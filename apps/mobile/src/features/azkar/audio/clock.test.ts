import { formatClock } from './clock';

describe('formatClock', () => {
  it('formats m:ss with Arabic-Indic digits in Arabic', () => {
    expect(formatClock(0, 'ar')).toBe('٠:٠٠');
    expect(formatClock(65_000, 'ar')).toBe('١:٠٥');
    expect(formatClock(9_999, 'ar')).toBe('٠:٠٩');
  });

  it('formats m:ss with Western digits in English', () => {
    expect(formatClock(0, 'en')).toBe('0:00');
    expect(formatClock(65_000, 'en')).toBe('1:05');
  });

  it('adds hours past an hour', () => {
    expect(formatClock(3_725_000, 'en')).toBe('1:02:05');
    expect(formatClock(3_725_000, 'ar')).toBe('١:٠٢:٠٥');
  });

  it('reads negative and non-finite-free values as zero', () => {
    expect(formatClock(-500, 'en')).toBe('0:00');
  });
});
