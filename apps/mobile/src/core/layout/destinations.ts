import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

export type DestinationLabel = 'tabs.home' | 'tabs.mushaf' | 'tabs.listen' | 'tabs.myQuran' | 'tabs.salah';

export type Destination = {
  name: '(home)' | '(mushaf)' | '(listen)' | '(my-quran)' | '(salah)';
  href: Href;
  label: DestinationLabel;
  symbol: SFSymbol;
  androidIcon: 'home' | 'menu_book' | 'headphones' | 'bookmark' | 'account_circle' | 'mosque';
  testID: 'home' | 'mushaf' | 'listen' | 'my-quran' | 'salah';
};

// Full group paths: every tab's index is `/`, so typed routes need the group to tell them apart.
// The five tabs, in the order the tab bar draws them (quran-app-screens.html: مصحفي sits in the middle).
export const tabDestinations = [
  { name: '(home)', href: '/(main)/(home)', label: 'tabs.home', symbol: 'house', androidIcon: 'home', testID: 'home' },
  {
    name: '(mushaf)',
    href: '/(main)/(mushaf)',
    label: 'tabs.mushaf',
    symbol: 'book',
    androidIcon: 'menu_book',
    testID: 'mushaf',
  },
  {
    name: '(my-quran)',
    href: '/(main)/(my-quran)',
    label: 'tabs.myQuran',
    symbol: 'person.crop.circle',
    androidIcon: 'account_circle',
    testID: 'my-quran',
  },
  {
    name: '(listen)',
    href: '/(main)/(listen)',
    label: 'tabs.listen',
    symbol: 'headphones',
    androidIcon: 'headphones',
    testID: 'listen',
  },
  {
    name: '(salah)',
    href: '/(main)/(salah)',
    label: 'tabs.salah',
    symbol: 'moon.stars',
    androidIcon: 'mosque',
    testID: 'salah',
  },
] as const satisfies readonly Destination[];

// The expanded-window sidebar pins مصحفي to the top (ADR 0010), then follows the tab order.
const sidebarOrder: readonly Destination['name'][] = ['(my-quran)', '(home)', '(mushaf)', '(listen)', '(salah)'];

export const sidebarDestinations: Destination[] = sidebarOrder.map((name) => {
  const destination = tabDestinations.find((d) => d.name === name);
  if (destination === undefined) {
    throw new Error(`Unknown destination ${name}`);
  }
  return destination;
});
