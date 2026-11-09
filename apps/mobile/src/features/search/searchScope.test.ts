import { readSessionSearchScope, rememberSessionSearchScope } from './searchScope';

describe('search scope for the session', () => {
  afterEach(() => {
    rememberSessionSearchScope('quran');
  });

  it('starts on the Quran scope', () => {
    expect(readSessionSearchScope()).toBe('quran');
  });

  it('keeps the scope the reader picked, until it is changed', () => {
    rememberSessionSearchScope('azkar');

    expect(readSessionSearchScope()).toBe('azkar');

    rememberSessionSearchScope('quran');

    expect(readSessionSearchScope()).toBe('quran');
  });

  it('keeps the Hadith scope too', () => {
    rememberSessionSearchScope('hadith');

    expect(readSessionSearchScope()).toBe('hadith');
  });
});
