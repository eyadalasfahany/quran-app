import { prayerClock } from './clock';

describe('prayerClock', () => {
  it('keeps the period marker in Arabic with Arabic-Indic digits', () => {
    const afternoon = new Date(2026, 10, 1, 15, 15);
    expect(prayerClock(afternoon, 'ar')).toMatch(/^[٠-٩]+:[٠-٩]{2} /);
    expect(prayerClock(afternoon, 'en')).toBe('3:15 PM');
  });
});
