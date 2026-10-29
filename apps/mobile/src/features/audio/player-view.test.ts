import {
  ERROR_KEYS,
  fractionAfterDrag,
  formatClock,
  playbackFraction,
  reciterInitial,
  recitationStyleKey,
  steppedPosition,
  wordStates,
} from './player-view';

describe('reciterInitial', () => {
  it.each([
    ['مشاري راشد العفاسي', 'ع'],
    ['عبد الباسط عبد الصمد', 'ص'],
    ['محمود خليل الحصري', 'ح'],
    ['Mishari Rashid al-`Afasy', 'A'],
    ['Mahmoud Khaleel Al-Husary', 'H'],
    ['Yasser ad-Dussary', 'D'],
    ['Sa`ud ash-Shuraym', 'S'],
    ['Abdur-Rahman as-Sudais', 'S'],
    ['  ', ''],
  ])('gives the family initial of %s', (name, letter) => {
    expect(reciterInitial(name)).toBe(letter);
  });
});


describe('recitationStyleKey', () => {
  it('maps the English styles QF sends to their i18n keys', () => {
    expect(recitationStyleKey('Murattal')).toBe('player.style.murattal');
    expect(recitationStyleKey('Mujawwad')).toBe('player.style.mujawwad');
    expect(recitationStyleKey('Muallim')).toBe('player.style.muallim');
  });

  it('hides the pill for an unknown, empty or missing style', () => {
    expect(recitationStyleKey('Hadr')).toBeNull();
    expect(recitationStyleKey('')).toBeNull();
    expect(recitationStyleKey(null)).toBeNull();
    expect(recitationStyleKey(undefined)).toBeNull();
    expect(recitationStyleKey('constructor')).toBeNull();
  });
});

describe('ERROR_KEYS', () => {
  it('has a message key for every player error code', () => {
    expect(Object.keys(ERROR_KEYS).sort()).toEqual([
      'invalid-chapter',
      'invalid-verse',
      'load-failed',
      'no-reciter',
      'not-found',
      'not-installed',
    ]);
  });
});

describe('formatClock', () => {
  it('formats m:ss with Arabic-Indic digits in Arabic', () => {
    expect(formatClock(24_000, 'ar')).toBe('٠:٢٤');
    expect(formatClock(48_000, 'ar')).toBe('٠:٤٨');
    expect(formatClock(65_000, 'ar')).toBe('١:٠٥');
  });

  it('formats m:ss with Western digits in English', () => {
    expect(formatClock(24_000, 'en')).toBe('0:24');
    expect(formatClock(605_000, 'en')).toBe('10:05');
  });

  it('shows zero for an unknown duration', () => {
    expect(formatClock(0, 'ar')).toBe('٠:٠٠');
    expect(formatClock(0, 'en')).toBe('0:00');
    expect(formatClock(Number.NaN, 'en')).toBe('0:00');
  });
});

describe('playbackFraction', () => {
  it('is the played share of a known duration, clamped to 0..1', () => {
    expect(playbackFraction(24_000, 48_000)).toBe(0.5);
    expect(playbackFraction(60_000, 48_000)).toBe(1);
    expect(playbackFraction(-5, 48_000)).toBe(0);
  });

  it('is 0 while the duration is unknown', () => {
    expect(playbackFraction(24_000, 0)).toBe(0);
  });
});

describe('steppedPosition', () => {
  it('moves by the step and stays inside the file', () => {
    expect(steppedPosition(5_000, 10_000, 48_000)).toBe(15_000);
    expect(steppedPosition(5_000, -10_000, 48_000)).toBe(0);
    expect(steppedPosition(45_000, 10_000, 48_000)).toBe(48_000);
  });

  it('stays at 0 while the duration is unknown', () => {
    expect(steppedPosition(5_000, 10_000, 0)).toBe(0);
  });
});

describe('wordStates', () => {
  it('marks words before the active one as recited, the active one as current, the rest as upcoming', () => {
    expect(wordStates(4, 2)).toEqual(['recited', 'current', 'upcoming', 'upcoming']);
  });

  it('reads the active word as a 1-based position, so the first word lights first', () => {
    expect(wordStates(4, 1)).toEqual(['current', 'upcoming', 'upcoming', 'upcoming']);
    expect(wordStates(4, 4)).toEqual(['recited', 'recited', 'recited', 'current']);
  });

  it('leaves every word upcoming when no word is active', () => {
    expect(wordStates(3, null)).toEqual(['upcoming', 'upcoming', 'upcoming']);
  });
});

describe('fractionAfterDrag', () => {
  it('moves forward with a drag to the end edge, which is the right in Arabic', () => {
    expect(fractionAfterDrag(0.5, 60, 300, false)).toBeCloseTo(0.7);
    expect(fractionAfterDrag(0.5, -60, 300, true)).toBeCloseTo(0.7);
  });

  it('clamps to 0..1 and ignores a track with no width yet', () => {
    expect(fractionAfterDrag(0.9, 300, 300, false)).toBe(1);
    expect(fractionAfterDrag(0.1, -300, 300, false)).toBe(0);
    expect(fractionAfterDrag(0.4, 50, 0, false)).toBe(0.4);
  });
});
