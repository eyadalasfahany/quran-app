import { categoryPager, parseCategoryItemIndex } from './category-pager';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn(), push: jest.fn() },
}));

describe('parseCategoryItemIndex', () => {
  it('reads a whole number, 0-based', () => {
    expect(parseCategoryItemIndex('0')).toBe(0);
    expect(parseCategoryItemIndex('44')).toBe(44);
  });

  it('returns null for anything that is not a whole number', () => {
    expect(parseCategoryItemIndex('')).toBeNull();
    expect(parseCategoryItemIndex('-1')).toBeNull();
    expect(parseCategoryItemIndex('1.5')).toBeNull();
    expect(parseCategoryItemIndex('abc')).toBeNull();
  });
});

describe('categoryPager', () => {
  it('counts the category: position is 1-based and total is the category size', () => {
    const pager = categoryPager('quran', 41, 0);
    expect(pager.position).toBe(1);
    expect(pager.total).toBe(41);
  });

  it('has no previous at the first item and a next to the second', () => {
    const pager = categoryPager('quran', 3, 0);
    expect(pager.previousHref).toBeNull();
    expect(pager.nextHref).toBe('/duas/category/quran/1');
  });

  it('links both neighbours inside the middle of the category', () => {
    const pager = categoryPager('hisn:morning', 5, 2);
    expect(pager.previousHref).toBe('/duas/category/hisn%3Amorning/1');
    expect(pager.nextHref).toBe('/duas/category/hisn%3Amorning/3');
  });

  it('has no next at the last item, so the pager ends with its category', () => {
    const pager = categoryPager('quran', 41, 40);
    expect(pager.position).toBe(41);
    expect(pager.nextHref).toBeNull();
    expect(pager.previousHref).toBe('/duas/category/quran/39');
  });

  it('has neither neighbour in a category of one', () => {
    const pager = categoryPager('quran', 1, 0);
    expect(pager.previousHref).toBeNull();
    expect(pager.nextHref).toBeNull();
  });
});
