import { router } from 'expo-router';

import { azkarHref, goBackOr } from './routes';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));

describe('azkarHref', () => {
  it('builds the fixed routes', () => {
    expect(azkarHref.home).toBe('/azkar');
    expect(azkarHref.search).toBe('/azkar/search');
    expect(azkarHref.favorites).toBe('/azkar/favorites');
    expect(azkarHref.downloads).toBe('/azkar/downloads');
  });

  it('encodes content keys into one segment', () => {
    expect(azkarHref.category('home-and-family')).toBe('/azkar/category/home-and-family');
    expect(azkarHref.entry('fixture:entry-001')).toBe('/azkar/entry/fixture%3Aentry-001');
  });

  it('opens the reminder sheet for a category, an entry or nothing', () => {
    expect(azkarHref.reminders()).toBe('/azkar/reminders');
    expect(azkarHref.reminders({ category: 'morning' })).toBe('/azkar/reminders?category=morning');
    expect(azkarHref.reminders({ entry: 'fixture:entry-001' })).toBe('/azkar/reminders?entry=fixture%3Aentry-001');
  });

  it('opens the reader at a unit when one is given', () => {
    expect(azkarHref.read('morning')).toBe('/azkar/read/morning');
    expect(azkarHref.read('morning', 'fixture:item-1')).toBe('/azkar/read/morning?unit=fixture%3Aitem-1');
  });

  it('names the Menu home tab', () => {
    expect(azkarHref.homeTab).toBe('/(main)/(home)');
  });
});

describe('goBackOr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pops the stack when there is history', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);

    goBackOr(azkarHref.home);

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('replaces the screen with the fallback when there is no history', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);

    goBackOr(azkarHref.home);

    expect(router.replace).toHaveBeenCalledWith('/azkar');
    expect(router.back).not.toHaveBeenCalled();
  });
});
