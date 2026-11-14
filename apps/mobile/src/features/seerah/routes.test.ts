import { seerahHref, parseSeerahAge, parseSeerahView } from './routes';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(), replace: jest.fn() },
}));

describe('seerahHref', () => {
  it('builds the fixed routes', () => {
    expect(seerahHref.home).toBe('/seerah');
    expect(seerahHref.list).toBe('/seerah?view=list');
    expect(seerahHref.homeTab).toBe('/(main)/(home)');
  });

  it('builds and encodes the event route', () => {
    expect(seerahHref.event('e042')).toBe('/seerah/event/e042');
    expect(seerahHref.event('e042.1')).toBe('/seerah/event/e042.1');
    expect(seerahHref.event('a b/c')).toBe('/seerah/event/a%20b%2Fc');
  });
});

describe('seerahHref.map', () => {
  it('builds the map route with an age and a place', () => {
    expect(seerahHref.map()).toBe('/seerah');
    expect(seerahHref.map({ age: 40 })).toBe('/seerah?age=40');
    expect(seerahHref.map({ place: 'makkah.kaaba' })).toBe('/seerah?place=makkah.kaaba');
    expect(seerahHref.map({ age: 0, place: 'a b' })).toBe('/seerah?age=0&place=a%20b');
  });
});

describe('parseSeerahAge', () => {
  it('accepts 0 to 63 only', () => {
    expect(parseSeerahAge('0')).toBe(0);
    expect(parseSeerahAge('63')).toBe(63);
    expect(parseSeerahAge('64')).toBeNull();
    expect(parseSeerahAge('-1')).toBeNull();
    expect(parseSeerahAge('4x')).toBeNull();
    expect(parseSeerahAge(undefined)).toBeNull();
    expect(parseSeerahAge(['12', '13'])).toBe(12);
  });
});

describe('parseSeerahView', () => {
  it('reads list and map and ignores anything else', () => {
    expect(parseSeerahView('list')).toBe('list');
    expect(parseSeerahView(['list', 'map'])).toBe('list');
    expect(parseSeerahView('map')).toBe('map');
    expect(parseSeerahView('x')).toBeNull();
    expect(parseSeerahView(undefined)).toBeNull();
  });
});
