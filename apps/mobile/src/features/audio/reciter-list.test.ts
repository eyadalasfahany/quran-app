import {
  joinStatusLine,
  matchesFilter,
  matchesQuery,
  normalizeForSearch,
  reciterDisplayName,
  reciterStatus,
} from './reciter-list';

describe('normalizeForSearch', () => {
  it('drops harakat and tatweel, and folds alef, alef maqsura and taa marbuta', () => {
    expect(normalizeForSearch('مُشَارِي  ـ')).toBe('مشاري');
    expect(normalizeForSearch('إبراهيم آدم')).toBe('ابراهيم ادم');
    expect(normalizeForSearch('مصطفى')).toBe('مصطفي');
    expect(normalizeForSearch('رحمة')).toBe('رحمه');
  });

  it('lowercases and collapses spaces', () => {
    expect(normalizeForSearch('  Al-  Husary ')).toBe('al- husary');
  });
});

describe('matchesQuery', () => {
  const reciter = { name: 'Mahmoud Khalil Al-Husary', nameAr: 'محمود خليل الحصري' };

  it('matches everything for an empty query', () => {
    expect(matchesQuery(reciter, '   ')).toBe(true);
  });

  it('matches the Arabic name and the English name, ignoring case and harakat', () => {
    expect(matchesQuery(reciter, 'الحصرِي')).toBe(true);
    expect(matchesQuery(reciter, 'husary')).toBe(true);
    expect(matchesQuery(reciter, 'HUSARY')).toBe(true);
  });

  it('does not match a name that is not there', () => {
    expect(matchesQuery(reciter, 'العفاسي')).toBe(false);
  });

  it('matches a reciter with no English name by the Arabic one alone', () => {
    expect(matchesQuery({ name: null, nameAr: 'مشاري' }, 'مشاري')).toBe(true);
    expect(matchesQuery({ name: null, nameAr: 'مشاري' }, 'afasy')).toBe(false);
  });
});

describe('matchesFilter', () => {
  it('shows every reciter for «الكل»', () => {
    expect(matchesFilter({ style: null }, 'all')).toBe(true);
  });

  it('matches only the reciter whose style is the chip', () => {
    expect(matchesFilter({ style: 'Murattal' }, 'Murattal')).toBe(true);
    expect(matchesFilter({ style: 'Murattal' }, 'Muallim')).toBe(false);
  });

  it('hides a reciter whose style is unknown from every style chip', () => {
    expect(matchesFilter({ style: null }, 'Murattal')).toBe(false);
  });

  it('shows only the reciters with a downloaded surah for «المحمّلة»', () => {
    expect(matchesFilter({ style: 'Murattal' }, 'downloaded', 2)).toBe(true);
    expect(matchesFilter({ style: 'Murattal' }, 'downloaded', 0)).toBe(false);
    expect(matchesFilter({ style: null }, 'downloaded')).toBe(false);
  });
});

describe('joinStatusLine', () => {
  it('joins the parts with a middle dot and skips the missing ones', () => {
    expect(joinStatusLine(['يُتلى الآن', '٣ سور محمّلة'])).toBe('يُتلى الآن · ٣ سور محمّلة');
    expect(joinStatusLine([null, '٣ سور محمّلة'])).toBe('٣ سور محمّلة');
    expect(joinStatusLine(['يُتلى الآن', null])).toBe('يُتلى الآن');
  });

  it('is null when no part is left', () => {
    expect(joinStatusLine([null, ''])).toBeNull();
  });
});

describe('reciterDisplayName', () => {
  const names = { name: 'Afasy', nameAr: 'مشاري' };

  it('uses the Arabic name in Arabic and the English name in English', () => {
    expect(reciterDisplayName(names, 'ar', 'x')).toBe('مشاري');
    expect(reciterDisplayName(names, 'en', 'x')).toBe('Afasy');
  });

  it('falls back to the other language, then to the placeholder', () => {
    expect(reciterDisplayName({ name: 'Afasy', nameAr: null }, 'ar', 'x')).toBe('Afasy');
    expect(reciterDisplayName({ name: '  ', nameAr: 'مشاري' }, 'en', 'x')).toBe('مشاري');
    expect(reciterDisplayName({ name: null, nameAr: null }, 'ar', 'قارئ')).toBe('قارئ');
  });
});

describe('reciterStatus', () => {
  it('shows «يُتلى الآن» for the reciter playing, ahead of everything else', () => {
    expect(reciterStatus({ failed: true, playing: true, style: 'Muallim' })).toBe('nowPlaying');
  });

  it('shows a failed download before the teaching note', () => {
    expect(reciterStatus({ failed: true, playing: false, style: 'Muallim' })).toBe('failed');
  });

  it('shows the teaching note only for the Muallim style', () => {
    expect(reciterStatus({ failed: false, playing: false, style: 'Muallim' })).toBe('teaching');
    expect(reciterStatus({ failed: false, playing: false, style: 'Murattal' })).toBeNull();
    expect(reciterStatus({ failed: false, playing: false, style: null })).toBeNull();
  });
});
