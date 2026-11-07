import { hadithCreditKey, isUnavailableHadith } from './source-credit';

describe('hadithCreditKey', () => {
  it('gives the collection credit for null, fawazahmed0 and an unknown code', () => {
    expect(hadithCreditKey(null)).toBe('hadith.source.credit');
    expect(hadithCreditKey(undefined)).toBe('hadith.source.credit');
    expect(hadithCreditKey('fawazahmed0')).toBe('hadith.source.credit');
    expect(hadithCreditKey('unknown-code')).toBe('hadith.source.credit');
  });

  it('gives the filled-text credit for openiti and hadithapicom', () => {
    expect(hadithCreditKey('openiti')).toBe('hadith.source.creditOpeniti');
    expect(hadithCreditKey('hadithapicom')).toBe('hadith.source.creditHadithapicom');
  });

  it('gives the filled-text credit for the meeatif and hadithjson datasets', () => {
    expect(hadithCreditKey('meeatif')).toBe('hadith.source.creditMeeatif');
    expect(hadithCreditKey('hadithjson')).toBe('hadith.source.creditHadithjson');
  });
});

describe('isUnavailableHadith', () => {
  it('is true only for the placeholder code', () => {
    expect(isUnavailableHadith('unavailable')).toBe(true);
    expect(isUnavailableHadith('openiti')).toBe(false);
    expect(isUnavailableHadith(null)).toBe(false);
  });
});
