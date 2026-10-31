import { sidebarDestinations, tabDestinations } from './destinations';

describe('tabDestinations', () => {
  it('has the correct order and content', () => {
    expect(tabDestinations.map((d) => d.name)).toEqual(['(home)', '(mushaf)', '(listen)', '(my-quran)']);
    const myQuranTab = tabDestinations.find((d) => d.name === '(my-quran)');
    expect(myQuranTab?.symbol).toBe('person.crop.circle');
    expect(myQuranTab?.androidIcon).toBe('account_circle');
  });
});

describe('sidebarDestinations', () => {
  it('has the correct order and content', () => {
    expect(sidebarDestinations.map((d) => d.name)).toEqual([
      '(my-quran)',
      '(home)',
      '(mushaf)',
      '(listen)',
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