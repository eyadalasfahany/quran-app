import { azkarHref } from './routes';

describe('azkarHref', () => {
  it('builds the fixed routes', () => {
    expect(azkarHref.home).toBe('/azkar');
    expect(azkarHref.search).toBe('/azkar/search');
    expect(azkarHref.favorites).toBe('/azkar/favorites');
  });

  it('encodes content keys into one segment', () => {
    expect(azkarHref.category('home-and-family')).toBe('/azkar/category/home-and-family');
    expect(azkarHref.entry('fixture:entry-001')).toBe('/azkar/entry/fixture%3Aentry-001');
  });

  it('opens the reader at a unit when one is given', () => {
    expect(azkarHref.read('morning')).toBe('/azkar/read/morning');
    expect(azkarHref.read('morning', 'fixture:item-1')).toBe('/azkar/read/morning?unit=fixture%3Aitem-1');
  });
});
