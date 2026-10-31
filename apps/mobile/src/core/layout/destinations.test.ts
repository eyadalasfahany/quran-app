import { destinations, sidebarDestinations, tabDestinations } from './destinations';

const byName = (name: string) => {
  const found = destinations.find((d) => d.name === name);
  if (found === undefined) {
    throw new Error(`no destination ${name}`);
  }
  return found;
};

describe('tabDestinations', () => {
  it('lists the five tabs in the tab bar order, with القائمة last (ADR 0032)', () => {
    expect(tabDestinations.map((d) => d.name)).toEqual(['(home)', '(mushaf)', '(my-quran)', '(listen)', '(menu)']);
  });

  it('puts مصحفي in the middle of the five tabs', () => {
    expect(tabDestinations).toHaveLength(5);
    expect(tabDestinations[2].name).toBe('(my-quran)');
    expect(tabDestinations[2].symbol).toBe('person.crop.circle');
    expect(tabDestinations[2].androidIcon).toBe('account_circle');
  });

  it('has the menu tab last, with the line-3 icon, its label and route', () => {
    const menuTab = tabDestinations[4];
    expect(menuTab.label).toBe('tabs.menu');
    expect(menuTab.symbol).toBe('line.3.horizontal');
    expect(menuTab.androidIcon).toBe('menu');
    expect(menuTab.testID).toBe('menu');
    expect(menuTab.href).toBe('/(main)/(menu)');
  });

  it('no longer lists الصلاة as a tab', () => {
    expect(tabDestinations.map((d) => d.name)).not.toContain('(salah)');
  });
});

describe('destinations', () => {
  it('keeps the Salah route as a destination the menu can open', () => {
    expect(byName('(salah)')).toMatchObject({
      href: '/(main)/(salah)',
      label: 'tabs.salah',
      symbol: 'moon.stars',
      androidIcon: 'mosque',
    });
  });

  it('contains every tab and the Salah route, and nothing else', () => {
    expect(destinations.map((d) => d.name).sort()).toEqual(
      ['(home)', '(listen)', '(menu)', '(mushaf)', '(my-quran)', '(salah)'].sort(),
    );
  });
});

describe('sidebarDestinations', () => {
  it('keeps the sidebar order and still includes الصلاة', () => {
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

  it('does not add القائمة to the sidebar', () => {
    expect(sidebarDestinations.map((d) => d.name)).not.toContain('(menu)');
  });
});

describe('destinations consistency', () => {
  it('every tab and sidebar entry is a known destination', () => {
    const hrefs = new Set(destinations.map((d) => d.href));
    for (const destination of [...tabDestinations, ...sidebarDestinations]) {
      expect(hrefs.has(destination.href)).toBe(true);
    }
  });
});
