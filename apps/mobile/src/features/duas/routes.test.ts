import { router } from 'expo-router';

import { duasHref, goBackOr } from './routes';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));

describe('duasHref', () => {
  it('builds the fixed routes', () => {
    expect(duasHref.home).toBe('/duas');
    expect(duasHref.favorites).toBe('/duas/favorites');
    expect(duasHref.mine).toBe('/duas/mine');
    expect(duasHref.quranList).toBe('/duas/quran');
    expect(duasHref.quranDetail('quran:1:1')).toBe('/duas/quran/quran%3A1%3A1');
    expect(duasHref.hadithList).toBe('/duas/hadith');
    expect(duasHref.hadithGroup(42)).toBe('/duas/hadith?group=42');
    expect(duasHref.hadithDetail('hadeethenc:1')).toBe('/duas/hadith/hadeethenc%3A1');
  });

  it('opens the editor with an optional id', () => {
    expect(duasHref.mineEdit()).toBe('/duas/mine/edit');
    expect(duasHref.mineEdit('abc')).toBe('/duas/mine/edit?id=abc');
  });

  it('opens the reading view with the URL-encoded id', () => {
    expect(duasHref.mineDetail('abc')).toBe('/duas/mine/abc');
    expect(duasHref.mineDetail('a/b c')).toBe('/duas/mine/a%2Fb%20c');
  });

  it('opens the editor with its reminder row expanded when asked', () => {
    expect(duasHref.mineEdit('abc', { reminder: true })).toBe('/duas/mine/edit?id=abc&reminder=1');
    expect(duasHref.mineEdit(undefined, { reminder: true })).toBe('/duas/mine/edit?reminder=1');
    expect(duasHref.mineEdit('abc', { reminder: false })).toBe('/duas/mine/edit?id=abc');
  });
});

describe('goBackOr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops when history exists', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    goBackOr(duasHref.home);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('replaces when history is empty', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    goBackOr(duasHref.home);
    expect(router.replace).toHaveBeenCalledWith('/duas');
  });
});
