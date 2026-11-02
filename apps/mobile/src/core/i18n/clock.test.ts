import { formatPlaybackClock, prayerClock } from './clock';

describe('formatPlaybackClock', () => {
  it('formats m:ss with Arabic-Indic digits in Arabic', () => {
    expect(formatPlaybackClock(0, 'ar')).toBe('٠:٠٠');
    expect(formatPlaybackClock(24_000, 'ar')).toBe('٠:٢٤');
    expect(formatPlaybackClock(65_000, 'ar')).toBe('١:٠٥');
    expect(formatPlaybackClock(9_999, 'ar')).toBe('٠:٠٩');
    expect(formatPlaybackClock(605_000, 'ar')).toBe('١٠:٠٥');
  });

  it('formats m:ss with Western digits in English', () => {
    expect(formatPlaybackClock(0, 'en')).toBe('0:00');
    expect(formatPlaybackClock(24_000, 'en')).toBe('0:24');
    expect(formatPlaybackClock(65_000, 'en')).toBe('1:05');
    expect(formatPlaybackClock(605_000, 'en')).toBe('10:05');
  });

  it('shows 59 seconds as m:ss before the hour mark', () => {
    expect(formatPlaybackClock(59_000, 'en')).toBe('0:59');
  });

  it('adds hours from one hour on', () => {
    expect(formatPlaybackClock(3_600_000, 'en')).toBe('1:00:00');
    expect(formatPlaybackClock(3_725_000, 'en')).toBe('1:02:05');
    expect(formatPlaybackClock(3_725_000, 'ar')).toBe('١:٠٢:٠٥');
  });

  it('reads NaN, infinity and negative values as zero', () => {
    expect(formatPlaybackClock(Number.NaN, 'en')).toBe('0:00');
    expect(formatPlaybackClock(Number.POSITIVE_INFINITY, 'en')).toBe('0:00');
    expect(formatPlaybackClock(-1, 'en')).toBe('0:00');
    expect(formatPlaybackClock(-1, 'ar')).toBe('٠:٠٠');
  });
});

describe('prayerClock', () => {
  it('keeps the period marker in Arabic with Arabic-Indic digits', () => {
    const afternoon = new Date(2026, 10, 1, 15, 15);
    expect(prayerClock(afternoon, 'ar')).toMatch(/^[٠-٩]+:[٠-٩]{2} /);
    expect(prayerClock(afternoon, 'en')).toBe('3:15 PM');
  });
});
