import { i18n } from '@/core/i18n';
import type { Locale } from '@/core/i18n/locale';

import {
  formatConjunctionPreview,
  formatConjunctionValue,
  formatEveningLabel,
  formatIlluminationPercent,
  formatMoonAge,
  formatMoonDay,
  formatMoonsetCompared,
  formatOdehV,
  formatSpan,
} from './format';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const tFor = (locale: Locale) => i18n.getFixedT(locale);

// ICU puts a narrow no-break space before AM/PM in English and joins Arabic with marks; the copy uses plain spaces.
function plain(text: string): string {
  return text.replace(/[‎‏؜  ]/g, ' ').replace(/ +/g, ' ').trim();
}

const ARABIC_DIGITS = /[٠-٩]/;
const WESTERN_DIGITS = /[0-9]/;

describe('formatIlluminationPercent', () => {
  it('shows one decimal in Arabic digits and the Arabic percent sign', () => {
    expect(formatIlluminationPercent(0.003, 'ar')).toBe('٠٫٣٪');
  });

  it('shows one decimal in English', () => {
    expect(formatIlluminationPercent(0.003, 'en')).toBe('0.3%');
  });

  it('rounds to one decimal, never to a whole number', () => {
    expect(formatIlluminationPercent(0.456, 'en')).toBe('45.6%');
    expect(formatIlluminationPercent(0.5, 'ar')).toBe('٥٠٪');
  });
});

describe('formatOdehV', () => {
  it('signs the value with a true minus and no degree sign', () => {
    expect(formatOdehV(-7.8, 'ar')).toBe('−٧٫٨');
    expect(formatOdehV(-7.8, 'en')).toBe('−7.8');
  });
});

describe('formatMoonDay', () => {
  it('shows the Gregorian day and month without the year, in Arabic digits', () => {
    expect(formatMoonDay(new Date(2026, 10, 9, 10, 2), 'ar')).toBe('٩ نوفمبر');
  });

  it('shows the short English month and the day', () => {
    expect(formatMoonDay(new Date(2026, 10, 9, 10, 2), 'en')).toBe('Nov 9');
    expect(formatMoonDay(new Date(2026, 11, 9, 3, 52), 'en')).toBe('Dec 9');
  });
});

describe('formatConjunctionValue', () => {
  const conjunction = new Date(2026, 10, 9, 10, 2);

  it('joins the day and the 12-hour time in Arabic (ص and م)', () => {
    expect(plain(formatConjunctionValue(conjunction, 'ar', tFor('ar')))).toBe('٩ نوفمبر · ١٠:٠٢ ص');
  });

  it('joins the day and the 12-hour time in English', () => {
    expect(plain(formatConjunctionValue(conjunction, 'en', tFor('en')))).toBe('Nov 9 · 10:02 AM');
  });

  it('shows the afternoon as م and PM', () => {
    const sunset = new Date(2026, 10, 9, 17, 40);
    expect(plain(formatConjunctionValue(sunset, 'ar', tFor('ar')))).toBe('٩ نوفمبر · ٥:٤٠ م');
    expect(plain(formatConjunctionValue(new Date(2026, 11, 9, 3, 52), 'en', tFor('en')))).toBe('Dec 9 · 3:52 AM');
  });
});

describe('formatMoonAge', () => {
  it('shows hours and minutes at sunset in Arabic', () => {
    expect(formatMoonAge(7 * HOUR + 38 * MINUTE, 'ar', tFor('ar'))).toBe('٧ ساعات و٣٨ دقيقة');
  });

  it('shows hours and minutes in English with h and min', () => {
    expect(formatMoonAge(7 * HOUR + 38 * MINUTE, 'en', tFor('en'))).toBe('7 h 38 min');
  });

  it('uses the Arabic singular and dual for one and two hours', () => {
    expect(formatMoonAge(HOUR + 5 * MINUTE, 'ar', tFor('ar'))).toBe('ساعة و٥ دقائق');
    expect(formatMoonAge(2 * HOUR, 'ar', tFor('ar'))).toBe('ساعتان');
  });

  it('uses the Arabic many form (ساعة) from eleven hours on', () => {
    expect(formatMoonAge(11 * HOUR, 'ar', tFor('ar'))).toBe('١١ ساعة');
  });

  it('drops the hours when there are none, and the minutes when there are none', () => {
    expect(formatMoonAge(38 * MINUTE, 'ar', tFor('ar'))).toBe('٣٨ دقيقة');
    expect(formatMoonAge(38 * MINUTE, 'en', tFor('en'))).toBe('38 min');
    expect(formatMoonAge(3 * HOUR, 'en', tFor('en'))).toBe('3 h');
  });

  it('shows zero as minutes, never as a blank', () => {
    expect(formatMoonAge(0, 'ar', tFor('ar'))).toBe('٠ دقيقة');
  });
});

describe('formatMoonsetCompared', () => {
  it('reads six minutes before sunset as «قبلها بـ ٦ دقائق» and "6 min before"', () => {
    expect(formatMoonsetCompared(-6 * MINUTE, 'ar', tFor('ar'))).toBe('قبلها بـ ٦ دقائق');
    expect(formatMoonsetCompared(-6 * MINUTE, 'en', tFor('en'))).toBe('6 min before');
  });

  it('reads a moonset after sunset as «بعدها» and "after", with the Arabic dual for two minutes', () => {
    expect(formatMoonsetCompared(2 * MINUTE, 'ar', tFor('ar'))).toBe('بعدها بدقيقتين');
    expect(formatMoonsetCompared(2 * MINUTE, 'en', tFor('en'))).toBe('2 min after');
  });

  it('uses the Arabic singular for one minute', () => {
    expect(formatMoonsetCompared(-MINUTE, 'ar', tFor('ar'))).toBe('قبلها بدقيقة');
  });

  it('reads the same minute as «في الوقت نفسه» and "At the same time"', () => {
    expect(formatMoonsetCompared(0, 'ar', tFor('ar'))).toBe('في الوقت نفسه');
    expect(formatMoonsetCompared(20_000, 'en', tFor('en'))).toBe('At the same time');
  });
});

describe('formatSpan', () => {
  it('uses minutes under an hour', () => {
    expect(formatSpan(45 * MINUTE, 'ar', tFor('ar'))).toBe('٤٥ دقيقة');
    expect(formatSpan(45 * MINUTE, 'en', tFor('en'))).toBe('45 minutes');
  });

  it('uses hours from an hour to two days, with the Arabic singular, dual and plural', () => {
    expect(formatSpan(HOUR, 'ar', tFor('ar'))).toBe('ساعة');
    expect(formatSpan(HOUR, 'en', tFor('en'))).toBe('1 hour');
    expect(formatSpan(2 * HOUR, 'ar', tFor('ar'))).toBe('ساعتين');
    expect(formatSpan(7 * HOUR, 'ar', tFor('ar'))).toBe('٧ ساعات');
    expect(formatSpan(7 * HOUR, 'en', tFor('en'))).toBe('7 hours');
  });

  it('uses days from two days on, with the Arabic forms', () => {
    expect(formatSpan(2 * DAY, 'ar', tFor('ar'))).toBe('يومين');
    expect(formatSpan(3 * DAY, 'ar', tFor('ar'))).toBe('٣ أيام');
    expect(formatSpan(11 * DAY, 'ar', tFor('ar'))).toBe('١١ يومًا');
    expect(formatSpan(7 * DAY, 'en', tFor('en'))).toBe('7 days');
  });
});

describe('formatConjunctionPreview', () => {
  const previous = new Date(2026, 9, 10, 4, 0);
  const next = new Date(2026, 10, 9, 10, 2);

  it('reads a conjunction that is about to come as «الاقتران خلال» and "Conjunction in"', () => {
    const now = new Date(next.getTime() - 7 * HOUR);
    expect(formatConjunctionPreview(now, previous, next, 'ar', tFor('ar'))).toBe('الاقتران خلال ٧ ساعات');
    expect(formatConjunctionPreview(now, previous, next, 'en', tFor('en'))).toBe('Conjunction in 7 hours');
  });

  it('reads a conjunction that passed as «الاقتران قبل» and "ago" when it is the nearer one', () => {
    const now = new Date(previous.getTime() + 7 * HOUR);
    expect(formatConjunctionPreview(now, previous, next, 'ar', tFor('ar'))).toBe('الاقتران قبل ٧ ساعات');
    expect(formatConjunctionPreview(now, previous, next, 'en', tFor('en'))).toBe('Conjunction 7 hours ago');
  });

  it('shows the conjunction nearer to now, in days when both are far away', () => {
    const now = new Date(2026, 10, 2, 12, 0);
    expect(formatConjunctionPreview(now, previous, next, 'en', tFor('en'))).toBe('Conjunction in 7 days');
    expect(formatConjunctionPreview(now, previous, next, 'ar', tFor('ar'))).toBe('الاقتران خلال ٧ أيام');
  });
});

describe('formatEveningLabel', () => {
  it('shows the Hijri evening and the Gregorian day in Arabic digits', () => {
    const label = formatEveningLabel(new Date(2026, 10, 9, 12, 0), 0, 'ar', tFor('ar'));
    expect(label).toMatch(/^مساء .+ · ٩ نوفمبر$/);
    expect(label).not.toMatch(WESTERN_DIGITS);
    expect(label).toMatch(ARABIC_DIGITS);
  });

  it('shows the Hijri evening and the Gregorian day in English', () => {
    const label = formatEveningLabel(new Date(2026, 10, 9, 12, 0), 0, 'en', tFor('en'));
    expect(label).toMatch(/^Evening of .+ · Nov 9$/);
  });
});
