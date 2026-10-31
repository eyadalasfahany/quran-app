import { sidebarDestinations, tabDestinations } from './destinations';

describe('tabDestinations', () => {
  it('has the correct order and content', () => {
    expect(tabDestinations.map((d) => d.name)).toEqual(['(home)', '(mushaf)', '(my-quran)', '(listen)', '(salah)']);
    const myQuranTab = tabDestinations.find((d) => d.name === '(my-quran)');
    expect(myQuranTab?.symbol).toBe('person.crop.circle');
    expect(myQuranTab?.androidIcon).toBe('account_circle');
  });

  it('puts مصحفي in the middle of the five tabs', () => {
    expect(tabDestinations).toHaveLength(5);
    expect(tabDestinations[2].name).toBe('(my-quran)');
  });

  it('has the salah tab last with the moon-star icon', () => {
    const salahTab = tabDestinations.find((d) => d.name === '(salah)');
    expect(salahTab?.symbol).toBe('moon.stars');
    expect(salahTab?.androidIcon).toBe('mosque');
    expect(salahTab?.label).toBe('tabs.salah');
    expect(salahTab?.href).toBe('/(main)/(salah)');
  });
});

describe('sidebarDestinations', () => {
  it('has the correct order and content', () => {
    expect(sidebarDestinations.map((d) => d.name)).toEqual([
      '(my-quran)',
      '(home)',
      '(mushaf)',
      '(listen)',
      '(salah)',
    ]);
    const myQuranSidebar = sidebarDestinations.find((d) => d.name === '(my-quran)');
    expect(myQuranSidebar?.symbol).toBe('person.crop.circle');
    expect(myQuranSidebar?.androidIcon).toBe('account_circle');
  });
});

describe('destinations consistency', () => {
  it('tabDestinations and sidebarDestinations contain the same records', () => {
    expect(tabDestinations.length).toBe(sidebarDestinations.length);
    const tabHrefs = new Set(tabDestinations.map((d) => d.href));
    const sidebarHrefs = new Set(sidebarDestinations.map((d) => d.href));
    expect(tabHrefs).toEqual(sidebarHrefs);
  });
});
