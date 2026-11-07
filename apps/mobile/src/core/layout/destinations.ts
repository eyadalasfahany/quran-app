import type { Href } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';

export type DestinationLabel = 'tabs.home' | 'tabs.mushaf' | 'tabs.listen' | 'tabs.myQuran' | 'tabs.salah' | 'tabs.menu';

export type Destination = {
  name: '(home)' | '(mushaf)' | '(listen)' | '(my-quran)' | '(salah)' | '(menu)';
  href: Href;
  label: DestinationLabel;
  symbol: SFSymbol;
  androidIcon: 'home' | 'menu_book' | 'headphones' | 'bookmark' | 'account_circle' | 'mosque' | 'menu';
  testID: 'home' | 'mushaf' | 'listen' | 'my-quran' | 'salah' | 'menu';
};

// Full group paths: every tab's index is `/`, so typed routes need the group to tell them apart.
// Every destination the app has, the tabs and the Salah route the menu opens (ADR 0032).
export const destinations = [
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
    // Not /(main)/(salah): that route has no tab item, so the native tabs render it blank. It is reached at /salah,
    // a root stack route outside the tabs (app/salah/index.tsx), from the menu card (ADR 0032).
    name: '(salah)',
    href: '/salah',
    label: 'tabs.salah',
    symbol: 'moon.stars',
    androidIcon: 'mosque',
    testID: 'salah',
  },
  {
    name: '(menu)',
    href: '/(main)/(menu)',
    label: 'tabs.menu',
    symbol: 'line.3.horizontal',
    androidIcon: 'menu',
    testID: 'menu',
  },
] as const satisfies readonly Destination[];

type DestinationName = Destination['name'];

function destinationNamed(name: DestinationName): Destination {
  const destination = destinations.find((item) => item.name === name);
  if (destination === undefined) {
    throw new Error(`Unknown destination ${name}`);
  }
  return destination;
}

// The five tabs, in the order the tab bar draws them (first is rightmost in RTL). مصحفي sits in the middle
// (screens/). The الصلاة tab gave its place to القائمة (ADR 0032); its route stays registered.
const tabOrder: readonly DestinationName[] = ['(home)', '(mushaf)', '(my-quran)', '(listen)', '(menu)'];
export const tabDestinations: Destination[] = tabOrder.map(destinationNamed);
